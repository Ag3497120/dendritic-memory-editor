import json
import requests
from iath_encoder import IathEncoder
from datetime import datetime
import os

# ユーザー提供の変換ロジック
def convert_d1_to_iath_v1_compatible(d1_tile: dict) -> dict:
    """v1互換性のため、不足フィールドに合理的なデフォルト値を設定"""
    
    # knowledge_idがmetadataの一部であることを考慮
    knowledge_id = d1_tile.get('id')
    
    # contentをthinking_processとfinal_responseに分割
    content_text = d1_tile.get('content', '')
    
    # author_markをマッピング
    author_mark_str = d1_tile.get('author_mark', 'community') # デフォルトはcommunity
    
    return {
        'metadata': {
            'knowledge_id': knowledge_id,
            'topic': d1_tile.get('topic', 'Untitled Topic'),
            'created_at': d1_tile.get('created_at', datetime.now().isoformat())
        },
        'coordinates': {
            'medical_space': [
                d1_tile.get('coordinates_x', 0.0),
                d1_tile.get('coordinates_y', 0.0),
                d1_tile.get('coordinates_z', 0.0)
            ],
            'meta_space': [
                0.0,  # デフォルト: c (Certainty)
                0.0,  # デフォルト: g (Granularity)
                0.0   # デフォルト: v (Verification)
            ]
        },
        'content': {
            'thinking_process': f"[Auto-imported]\n{content_text}",
            'final_response': content_text
        },
        'verification': {
            'status': d1_tile.get('verification_status', 'pending_review'),
            'initial_certainty': 0.5,  # デフォルト値
            'reviewers': []  # 空配列
        }
    }

def main():
    BACKEND_API_URL = "https://dendritic-memory-backend.nullai-db-app-face.workers.dev" # あなたのバックエンドのURL
    EXPORT_ENDPOINT = "/api/db/export"
    OUTPUT_FILENAME = "exported_db.iath"

    print(f"[{datetime.now()}] バックエンドからデータエクスポート中: {BACKEND_API_URL}{EXPORT_ENDPOINT}")
    
    try:
        response = requests.get(BACKEND_API_URL + EXPORT_ENDPOINT)
        response.raise_for_status()  # HTTPエラーがあれば例外を発生させる
        exported_data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"[{datetime.now()}] エラー: バックエンドからのデータ取得に失敗しました: {e}")
        return
    except json.JSONDecodeError as e:
        print(f"[{datetime.now()}] エラー: バックエンドのレスポンスがJSON形式ではありません: {e}")
        print(f"レスポンス内容: {response.text}")
        return

    knowledge_tiles_d1 = exported_data.get('knowledge_tiles', [])
    users_d1 = exported_data.get('users', [])
    
    print(f"[{datetime.now()}] 知識タイル {len(knowledge_tiles_d1)}件、ユーザー {len(users_d1)}件を取得しました。")

    if not knowledge_tiles_d1:
        print(f"[{datetime.now()}] エクスポートする知識タイルがありません。")
        return

    # IathEncoderはList[Dict]を期待するが、convert_d1_to_iath_v1_compatibleは単一のタイルを変換
    # バッチエンコードの前に全てのタイルを変換する必要がある
    iath_compatible_tiles = [convert_d1_to_iath_v1_compatible(tile) for tile in knowledge_tiles_d1]
    
    encoder = IathEncoder()
    # encoder.encode_batchはList[Dict]を期待
    iath_binary_data = encoder.encode_batch(iath_compatible_tiles, domain_code=1) # domain_code=1 for medical as default

    with open(OUTPUT_FILENAME, "wb") as f:
        f.write(iath_binary_data)
    
    print(f"[{datetime.now()}] データを {OUTPUT_FILENAME} に正常にエクスポートしました。")
    print(f"ファイルサイズ: {os.path.getsize(OUTPUT_FILENAME)} bytes")

if __name__ == "__main__":
    main()
