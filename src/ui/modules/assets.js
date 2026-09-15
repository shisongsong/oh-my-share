import { state } from './state.js';
import { t } from './i18n.js';
import { get, del } from './api.js';

export async function loadAssets() {
  if (!state.user) return;

  const list = document.getElementById('assetList');
  list.replaceChildren();

  try {
    const data = await get('/api/assets');
    if (!data.assets.length) {
      const empty = document.createElement('div');
      empty.className = 'asset-empty';
      empty.textContent = t('assetsEmpty');
      list.appendChild(empty);
      return;
    }

    data.assets.forEach((asset) => {
      const row = document.createElement('div');
      row.className = 'asset-row';

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0';

      const link = document.createElement('a');
      link.href = asset.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = asset.title || asset.filename || asset.id;
      link.className = 'asset-title';
      info.appendChild(link);

      if (asset.tags) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'asset-tags';
        asset.tags.split(',').forEach((tag) => {
          tag = tag.trim();
          if (tag) {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'asset-tag';
            tagSpan.textContent = tag;
            tagsDiv.appendChild(tagSpan);
          }
        });
        info.appendChild(tagsDiv);
      }

      const type = document.createElement('small');
      type.textContent = asset.encrypted ? 'AES-GCM' : 'HTML';

      const deleteButton = document.createElement('button');
      deleteButton.className = 'asset-delete';
      deleteButton.type = 'button';
      deleteButton.textContent = t('deleteAsset');
      deleteButton.addEventListener('click', () => deleteAsset(asset.id));

      row.appendChild(info);
      row.appendChild(type);
      row.appendChild(deleteButton);
      list.appendChild(row);
    });
  } catch (error) {
    const failed = document.createElement('div');
    failed.className = 'asset-empty';
    failed.textContent = error.message || t('authError');
    list.appendChild(failed);
  }
}

export async function deleteAsset(id) {
  if (!window.confirm(t('deleteConfirm'))) return;
  try {
    await del('/api/assets/' + encodeURIComponent(id));
    loadAssets();
  } catch (error) {
    window.alert(error.message || t('authError'));
  }
}
