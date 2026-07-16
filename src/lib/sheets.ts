import { google } from 'googleapis'
import path from 'path'

const SHEET_ID = process.env.HOBBY_WHISKY_SHEET_ID!
const TAB = '주류메타' // (구 '위스키' 탭 → 2026-07-13 리네임). 주류 마스터 미러(뷰)
export const PRICE_TAB = '주류시세' // 일자별 주류 가격 관측 소스

function getAuth() {
  const keyPath = process.env.GOOGLE_SA_KEY_PATH!
  const resolved = path.isAbsolute(keyPath) ? keyPath : path.join(process.cwd(), keyPath)
  return new google.auth.GoogleAuth({
    keyFile: resolved,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function client() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export async function readWhiskySheet(): Promise<string[][]> {
  const res = await client().spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB}!A1:O2000`,
  })
  return (res.data.values ?? []) as string[][]
}

export async function writeWhiskySheet(rows: string[][]): Promise<void> {
  const s = client()
  await s.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `${TAB}!A1:O100000` })
  if (rows.length) {
    await s.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    })
  }
}

// 주류메타 여러 컬럼에 드롭다운(데이터검증) 설정. 컬럼 이동에 대비해 A~O 전체 검증을 먼저 초기화 후 재적용.
export async function ensureMetaDropdowns(cols: { colIndex: number; values: string[] }[]): Promise<void> {
  const s = client()
  const meta = await s.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties' })
  const sheetId = meta.data.sheets?.find((sh) => sh.properties?.title === TAB)?.properties?.sheetId
  if (sheetId == null) return
  await s.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        // A~O(0~14), 1~1000행 기존 검증 초기화(rule 생략=clear)
        { setDataValidation: { range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 15 } } },
        ...cols.map((c) => ({
          setDataValidation: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: c.colIndex, endColumnIndex: c.colIndex + 1 },
            rule: {
              condition: { type: 'ONE_OF_LIST', values: c.values.map((v) => ({ userEnteredValue: v })) },
              showCustomUi: true,
              strict: false,
            },
          },
        })),
      ],
    },
  })
}
