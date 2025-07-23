# Next Development Features

## Planned Features

### 1. パレットタグ機能 (Palette Tagging System)
**Priority:** Medium  
**Status:** Planning

#### Description
色パレットにタグを追加する機能を実装し、パレットの整理・検索・分類を可能にする。

#### Technical Requirements
- SavedPalette interface にタグフィールド追加
- タグ入力UI（保存時・編集時）
- タグフィルタリング機能
- タグ表示UI（SavedPalettesPanel）
- タグ管理機能（追加・削除・編集）

#### Implementation Notes
- タグは配列形式で保存 (`tags: string[]`)
- 最大タグ数制限（例：10個）
- タグ名の文字数制限（例：20文字）
- タグの色分け表示
- 既存タグのオートコンプリート

---

### 2. Add Mode機能 (Additional Selection Mode)
**Priority:** Medium  
**Status:** Planning

#### Description
既存のextracted color paletteに追加選択範囲から抽出した色を合成する機能。

#### Implementation Approach
**フロー:** 初回抽出 → Add Modeボタン → 追加選択 → 色抽出 → パレット合成

#### Technical Requirements
- ColorPaletteに「+ Add More Colors」ボタン追加
- `isAddMode` 状態管理
- `mergeAndDeduplicateColors()` 関数実装
- 追加された色の視覚的区別（破線ボーダー + "+"アイコン）
- 色類似度判定による重複除去

#### Implementation Details
```typescript
// 状態管理
const [isAddMode, setIsAddMode] = useState(false);

// 合成ロジック
const mergeAndDeduplicateColors = (existing, newColors) => {
  // colorDistance()で類似色判定
  // isAdded: trueで追加色をマーク
  // MAX_COLORS制限適用
}

// UI区別
// 追加色: border-blue-400 border-dashed + "+"アイコン
// 元色: border-gray-200
```

#### User Experience
- 既存選択ツールをそのまま活用
- シンプルな「選択→抽出→追加」フロー
- 「Finish Adding」「Undo Last Addition」ボタン
- 最大色数制限で自動調整

---

## Implementation Order
1. パレットタグ機能（データ構造変更のため先行実装）
2. Add Mode機能（UI拡張として後続実装）

## Notes
- 両機能ともlocalStorage互換性を保つこと
- 既存のexport機能との連携を考慮
- TypeScript型定義の更新必須