// ===== 近畿大学マスタ（DBの faculties と id 対応） =====
// 学年別・学部別分析のための任意入力。id はサーバ faculties.id と一致させること。
export const FACULTIES: { id: number; name: string }[] = [
  { id: 1, name: '法学部' },
  { id: 2, name: '経済学部' },
  { id: 3, name: '経営学部' },
  { id: 4, name: '理工学部' },
  { id: 5, name: '建築学部' },
  { id: 6, name: '薬学部' },
  { id: 7, name: '文芸学部' },
  { id: 8, name: '総合社会学部' },
  { id: 9, name: '国際学部' },
  { id: 10, name: '情報学部' },
  { id: 11, name: '農学部' },
  { id: 12, name: '医学部' },
  { id: 13, name: '生物理工学部' },
  { id: 14, name: '工学部' },
  { id: 15, name: '産業理工学部' },
  { id: 99, name: 'その他' },
]

// 入学年度の選択肢（直近5年）。基準年は appDate から算出して呼び出し側で生成してもよいが、
// MVPでは固定リストで十分。
export const ENROLLMENT_YEARS: number[] = [2026, 2025, 2024, 2023, 2022]
