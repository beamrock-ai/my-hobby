import { google } from 'googleapis'
import path from 'path'

const SHEET_ID = process.env.HOBBY_WHISKY_SHEET_ID!
const TAB = '위스키'

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
    range: `${TAB}!A1:N2000`,
  })
  return (res.data.values ?? []) as string[][]
}

export async function writeWhiskySheet(rows: string[][]): Promise<void> {
  const s = client()
  await s.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `${TAB}!A1:N100000` })
  if (rows.length) {
    await s.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    })
  }
}

// 카테고리 컬럼(0-based colIndex)에 드롭다운(데이터검증) 설정. 값은 clear해도 검증은 유지됨.
export async function ensureCategoryDropdown(colIndex: number): Promise<void> {
  const s = client()
  const meta = await s.spreadsheets.get({ spreadsheetId: SHEET_ID, fields: 'sheets.properties' })
  const sheetId = meta.data.sheets?.find((sh) => sh.properties?.title === TAB)?.properties?.sheetId
  if (sheetId == null) return
  await s.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          setDataValidation: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: colIndex, endColumnIndex: colIndex + 1 },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: [{ userEnteredValue: '구매완료' }, { userEnteredValue: '지인선물' }, { userEnteredValue: '구매희망' }, { userEnteredValue: '지인추천' }, { userEnteredValue: '전문가추천' }, { userEnteredValue: '직접촬영' }],
              },
              showCustomUi: true,
              strict: false,
            },
          },
        },
      ],
    },
  })
}
