#!/usr/bin/env python3
"""
sync_trivia.py — 텔레그램 세션의 Q&A 내용을 MyHealth_DB연동 구글시트의
'상식' / '상식_문제은행' 두 탭에 1:1로 자동 동기화(append)한다.

입력: JSON 배열 (파일경로 인자 또는 stdin)
사용:
    python3 sync_trivia.py items.json
    cat items.json | python3 sync_trivia.py
    python3 sync_trivia.py items.json --dry-run   # 시트에 쓰지 않고 미리보기

JSON 항목 스키마 (필드 1개 = 상식 1행 + 문제은행 1문제):
[
  {
    "category":   "식품·영양",          // 상식.카테고리 / 문제은행.Section
    "group":      "음료",               // 상식.그룹명
    "subgroup":   "제로음료",           // 상식.서브그룹명  (문제은행.SubSection = "group / subgroup")
    "name":       "제로콜라 단맛의 원리", // 상식.이름 / 문제은행.title
    "desc":       "250ml 0kcal...",     // 상식.설명
    "expected_q": "제로콜라가 ...?",      // 상식.예상질문
    "answer":     "인공감미료를 사용",    // 상식.정답(짧은 정답)
    "difficulty": "하",                  // 상식.난이도 (하/중/상)
    "tags":       "제로콜라,감미료",      // 상식.태그
    "quiz": {
      "q_text":  "제로콜라가 0kcal인데도 단맛을 내는 이유는?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": "B",
      "explain": "정답은 B입니다. ..."
    }
  }
]
"""
import json
import sys
import re
from pathlib import Path

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

ADC = '/home/beamrock/.config/gcloud/application_default_credentials.json'
SID = '1OWxosNH0PfpvABSxHpUjIR4sRAbenHb2_IE1noL_99I'
TAB_KB = '상식'           # 지식 카드
TAB_BANK = '상식_문제은행'  # 4지선다 문제은행


def get_service():
    with open(ADC) as f:
        d = json.load(f)
    creds = Credentials(
        None,
        refresh_token=d['refresh_token'],
        client_id=d['client_id'],
        client_secret=d['client_secret'],
        token_uri='https://oauth2.googleapis.com/token',
        scopes=['https://www.googleapis.com/auth/spreadsheets'],
        quota_project_id=d['quota_project_id'],
    )
    creds.refresh(Request())
    return build('sheets', 'v4', credentials=creds)


def load_items(argv):
    paths = [a for a in argv if not a.startswith('-')]
    if paths:
        raw = Path(paths[0]).read_text(encoding='utf-8')
    else:
        raw = sys.stdin.read()
    items = json.loads(raw)
    if isinstance(items, dict):
        items = [items]
    return items


def main():
    dry = '--dry-run' in sys.argv
    items = load_items(sys.argv[1:])
    if not items:
        print('동기화할 항목이 없습니다.')
        return

    svc = get_service()
    vals = svc.spreadsheets().values()

    # 현재 상태 조회: 상식 No(A열) 최대값, 이름(E열) 집합, 문제은행 q_no(D열) 최대값
    kb = vals.get(spreadsheetId=SID, range=f'{TAB_KB}!A2:J').execute().get('values', [])
    bank = vals.get(spreadsheetId=SID, range=f'{TAB_BANK}!A2:H').execute().get('values', [])

    max_no = 0
    existing_names = set()
    for r in kb:
        if r and r[0].strip().isdigit():
            max_no = max(max_no, int(r[0].strip()))
        if len(r) >= 5 and r[4].strip():
            existing_names.add(r[4].strip())

    max_qno = 0
    for r in bank:
        if len(r) >= 4:
            m = re.match(r'Q\.?(\d+)', r[3].strip())
            if m:
                max_qno = max(max_qno, int(m.group(1)))

    kb_rows, bank_rows, skipped = [], [], []
    no = max_no
    qno = max_qno
    for it in items:
        name = it.get('name', '').strip()
        if not name:
            print('  ⚠ name 없는 항목 건너뜀'); continue
        if name in existing_names:
            skipped.append(name); continue
        existing_names.add(name)
        no += 1
        qno += 1

        kb_rows.append([
            str(no),
            it.get('category', ''),
            it.get('group', ''),
            it.get('subgroup', ''),
            name,
            it.get('desc', ''),
            it.get('expected_q', ''),
            it.get('answer', ''),
            it.get('difficulty', ''),
            it.get('tags', ''),
        ])

        q = it.get('quiz', {}) or {}
        subsection = it.get('group', '')
        if it.get('subgroup'):
            subsection = f"{it.get('group','')} / {it.get('subgroup','')}".strip(' /')
        bank_rows.append([
            it.get('category', ''),
            subsection,
            name,
            f'Q.{qno:03d}',
            q.get('q_text', it.get('expected_q', '')),
            '\n'.join(q.get('options', [])),
            q.get('correct', ''),
            q.get('explain', ''),
        ])

    print(f'기존: 상식 No 최대 {max_no}, 문제은행 q_no 최대 {max_qno}')
    print(f'추가 대상: {len(kb_rows)}건   건너뜀(중복 이름): {len(skipped)}건')
    if skipped:
        print('  건너뜀:', ', '.join(skipped))
    for r in kb_rows:
        print(f'  + 상식 No.{r[0]} | {r[4]}  →  문제은행')

    if not kb_rows:
        print('추가할 신규 항목 없음. 종료.')
        return

    if dry:
        print('\n[--dry-run] 시트에 쓰지 않았습니다. 미리보기만 출력.')
        return

    vals.append(
        spreadsheetId=SID, range=f'{TAB_KB}!A:J',
        valueInputOption='USER_ENTERED', insertDataOption='INSERT_ROWS',
        body={'values': kb_rows},
    ).execute()
    vals.append(
        spreadsheetId=SID, range=f'{TAB_BANK}!A:H',
        valueInputOption='USER_ENTERED', insertDataOption='INSERT_ROWS',
        body={'values': bank_rows},
    ).execute()
    print(f'\n✅ 동기화 완료: 상식 {len(kb_rows)}행 + 문제은행 {len(bank_rows)}문제 추가')


if __name__ == '__main__':
    main()
