import { state } from './state.js';
import { t } from './i18n.js';
import { get, post, del } from './api.js';

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

      if (asset.published) {
        const badge = document.createElement('span');
        badge.className = 'asset-badge';
        badge.textContent = t('publishedBadge');
        info.appendChild(badge);
      }

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

      const actions = document.createElement('div');
      actions.className = 'asset-actions';

      const manageBtn = document.createElement('a');
      if (asset.editToken) {
        manageBtn.href = `/manage/${asset.id}?token=${asset.editToken}`;
      } else {
        manageBtn.href = `/view/${asset.id}`;
      }
      manageBtn.target = '_blank';
      manageBtn.className = 'asset-manage';
      manageBtn.textContent = t('manageBtn');
      actions.appendChild(manageBtn);

      const publishButton = document.createElement('button');
      publishButton.className = 'asset-publish';
      publishButton.type = 'button';
      publishButton.textContent = asset.published ? t('unpublishBtn') : t('publishBtn');
      const expired = asset.expiresAt && asset.expiresAt * 1000 <= Date.now();
      const cannotPublish = asset.encrypted || asset.passwordProtected || expired;
      if (!asset.published && cannotPublish) {
        publishButton.disabled = true;
        publishButton.title = t('errCannotPublish');
      }
      publishButton.addEventListener('click', () => togglePublish(asset));
      actions.appendChild(publishButton);

      const deleteButton = document.createElement('button');
      deleteButton.className = 'asset-delete';
      deleteButton.type = 'button';
      deleteButton.textContent = t('deleteAsset');
      deleteButton.addEventListener('click', () => deleteAsset(asset.id));
      actions.appendChild(deleteButton);

      row.appendChild(info);
      row.appendChild(type);
      row.appendChild(actions);
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

export async function togglePublish(asset) {
  try {
    await post('/api/assets/' + encodeURIComponent(asset.id) + '/publish', {
      published: !asset.published,
    });
    loadAssets();
  } catch (error) {
    window.alert(error.message || t('authError'));
  }
}
