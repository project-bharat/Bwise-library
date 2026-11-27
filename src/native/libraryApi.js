import { getLocalPayload, mutateLocal } from './localDb';
import { previewFullBackup } from './backupFormat';

export const libraryApi = {
  getPayload: () => getLocalPayload(),
  previewFullBackup,
  saveBook: (payload) => mutateLocal('saveBook', [payload]),
  saveReadingGoal: (goal) => mutateLocal('saveReadingGoal', [goal]),
  updatePerson: (payload) => mutateLocal('updatePerson', [payload]),
  deletePerson: (name) => mutateLocal('deletePerson', [name]),
  saveWishlistBook: (payload) => mutateLocal('saveWishlistBook', [payload]),
  addAdminConfigItem: (type, item) => mutateLocal('addAdminConfigItem', [type, item]),
  deleteAdminConfigItem: (type, item) => mutateLocal('deleteAdminConfigItem', [type, item]),
  exportFullBackup: () => mutateLocal('exportFullBackup'),
  importFullBackup: (text) => mutateLocal('importFullBackup', [text])
};
