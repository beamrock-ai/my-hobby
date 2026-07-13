#!/usr/bin/env python3
"""
sync_nutrition.py — 사용자가 공유한 식품의 영양정보를 MyHealth_DB연동 구글시트의
'영양정보' 탭에 자동 추가(append)한다. 품목명 기준 중복 방지, No 자동 증번.
헤더가 없으면 자동 생성.

입력: JSON 배열 (파일경로 인자 또는 stdin)
사용:
    python3 sync_nutrition.py items.json
    cat items.json | python3 sync_nutrition.py
    python3 sync_nutrition.py items.json --dry-run

JSON 항목 스키마 (필드 1개 = 영양정보 1행):
[
  {
    "group":       "가공식품",               // 그룹명
    "subgroup":    "프로틴바",               // 서브그룹명
    "name":        "프로틴바(다크초콜릿)",   // 품목 (중복 판정 기준)
    "basis":       "40g(1개)",              // 기준량 (라벨 표기 기준)
    "kcal":        150,
    "carb":        19,                      // 탄수화물(g)
    "sugar":       0,                       // 당류(g)
    "fiber":       2.4,                     // 식이섬유(g)
    "protein":     12,                      // 단백질(g)
    "fat":         6,                       // 지방(g)
    "sat_fat":     1.7,                     // 포화지방(g)
    "trans_fat":   0,                       // 트랜스지방(g)
    "cholesterol": 0,                       // 콜레스테롤(mg)
    "sodium":      135,                     // 나트륨(mg)
    "calcium":     "",                      // 칼슘(mg), 없으면 빈값
    "source":      "라벨",                   // 출처: 라벨 / 추정 / 추정(일반) 등
    "note":        ""                       // 비고(선택)
  }
]
값이 없으면 빈 문자열로 두면 셀이 비어 들어간다.
"""
import json
import sys
from pathlib import Path
from datetime import date

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

ADC = '/home/beamrock/.config/gcloud/application_default_credentials.json'
SID = '1OWxosNH0PfpvABSxHpUjIR4sRAbenHb2_IE1noL_99I'
TAB = '영양정보'

HEADER = ['No', '그룹명', '서브그룹명', '품목', '기준량', '열량(kcal)', '탄수화물(g)',
          '당류(g)', '식이섬유(g)', '단백질(g)', '지방(g)', '포화지방(g)', '트랜스지방(g)',
          '콜레스테롤(mg)', '나트륨(mg)', '칼슘(mg)', '출처', '비고', '등록일']
LAST_COL = 'S'  # 19번째 열

FIELDS = ['kcal', 'carb', 'sugar', 'fiber', 'protein', 'fat', 'sat_fat',
          'trans_fat', 'cholesterol', 'sodium', 'calcium']


def get_service():
    with open(ADC) as f:
        d = json.load(f)
    creds = Credentials(
        None, refresh_token=d['refresh_token'], client_id=d['client_id'],
        client_secret=d['client_secret'], token_uri='https://oauth2.googleapis.com/token',
        scopes=['https://www.googleapis.com/auth/spreadsheets'],
        quota_project_id=d['quota_project_id'],
    )
    creds.refresh(Request())
    return build('sheets', 'v4', credentials=creds)


def load_items(argv):
    paths = [a for a in argv if not a.startswith('-')]
    raw = Path(paths[0]).read_text(encoding='utf-8') if paths else sys.stdin.read()
    items = json.loads(raw)
    return [items] if isinstance(items, dict) else items


def cell(v):
    return '' if v is None else str(v)


def main():
    dry = '--dry-run' in sys.argv
    items = load_items(sys.argv[1:])
    if not items:
        print('추가할 항목이 없습니다.'); return

    svc = get_service()
    vals = svc.spreadsheets().values()

    existing = vals.get(spreadsheetId=SID, range=f'{TAB}!A1:{LAST_COL}').execute().get('values', [])

    # 헤더 보장
    has_header = bool(existing) and existing[0] and existing[0][0].strip() == 'No'
    body_rows = existing[1:] if has_header else (existing if not has_header and existing and existing[0] and existing[0][0].strip() != 'No' else [])
    if not has_header:
        body_rows = existing  # 헤더가 없으면 기존 전체를 본문으로 간주(보통 빈 시트)

    max_no = 0
    names = set()
    for r in body_rows:
        if r and r[0].strip().isdigit():
            max_no = max(max_no, int(r[0].strip()))
        if len(r) >= 4 and r[3].strip():
            names.add(r[3].strip())

    today = date.today().isoformat()
    new_rows, skipped = [], []
    no = max_no
    for it in items:
        name = (it.get('name') or '').strip()
        if not name:
            print('  ⚠ name 없는 항목 건너뜀'); continue
        if name in names:
            skipped.append(name); continue
        names.add(name)
        no += 1
        row = [str(no), cell(it.get('group')), cell(it.get('subgroup')), name, cell(it.get('basis'))]
        row += [cell(it.get(f)) for f in FIELDS]
        row += [cell(it.get('source')), cell(it.get('note')), today]
        new_rows.append(row)

    print(f'기존: 품목 {len(body_rows)}개, No 최대 {max_no}')
    print(f'추가 대상: {len(new_rows)}건   건너뜀(중복 품목): {len(skipped)}건')
    if skipped:
        print('  건너뜀:', ', '.join(skipped))
    for r in new_rows:
        print(f'  + No.{r[0]} | [{r[1]}/{r[2]}] {r[3]} ({r[4]}) {r[5]}kcal 단백{r[9]}g')

    if dry:
        print('\n[--dry-run] 시트에 쓰지 않았습니다.'); return

    # 헤더 없으면 먼저 기록
    if not has_header:
        vals.update(spreadsheetId=SID, range=f'{TAB}!A1',
                    valueInputOption='RAW', body={'values': [HEADER]}).execute()
        print('헤더 생성 완료')

    if new_rows:
        vals.append(spreadsheetId=SID, range=f'{TAB}!A:{LAST_COL}',
                    valueInputOption='USER_ENTERED', insertDataOption='INSERT_ROWS',
                    body={'values': new_rows}).execute()
        print(f'\n✅ 동기화 완료: 영양정보 {len(new_rows)}행 추가')
    else:
        print('추가할 신규 품목 없음.')


if __name__ == '__main__':
    main()
