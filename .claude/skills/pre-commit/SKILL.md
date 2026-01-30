---
name: pre-commit
description: Check branch status before commit. Ensures work is not done on stale/merged branches.
user-invocable: true
allowed-tools: Bash, AskUserQuestion
---

コミット前にブランチ状態を確認し、適切なブランチで作業していることを保証する。

## 手順

1. 現在のブランチ名を取得
2. mainブランチの場合:
   - エラー: mainへの直接コミットは禁止
   - `branch` skillを使って新しいブランチを作成するよう指示
3. 機能ブランチの場合:
   - `gh pr list --head <branch-name> --state merged` でマージ済みPRがあるか確認
   - **マージ済みの場合**:
     - mainを最新にする (`git checkout main && git pull origin main`)
     - `branch` skillを使って新しいブランチを作成
   - **マージされていない場合**:
     - AskUserQuestionでユーザーに確認:
       - 選択肢1: 現在のブランチで作業を続ける
       - 選択肢2: mainを更新して新しいブランチを作成
     - ユーザーの選択に従って作業を継続
