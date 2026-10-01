/**
 * ================================================================
 * B-WISE LIBRARY — API BRIDGE FOR THE NATIVE ANDROID APP
 * Add this as a NEW file (ApiBridge.gs) next to Code.gs / SetupDatabase.gs.
 * Code.gs and SetupDatabase.gs stay EXACTLY as they are.
 *
 * One-time setup:
 *   1. Run generateApiToken() once from the editor, copy the token from the log.
 *   2. Deploy > New deployment > Web app
 *        Execute as: Me      Who has access: Anyone
 *   3. Copy the Web App URL (ends with /exec) -> enter URL + token in the app (menu > Sync Settings).
 * After EVERY change to the .gs files: Deploy > Manage deployments > Edit > New version.
 * ================================================================
 */

function generateApiToken() {
  var chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var t = '';
  for (var i = 0; i < 40; i++) t += chars.charAt(Math.floor(Math.random() * chars.length));
  PropertiesService.getScriptProperties().setProperty('API_TOKEN', t);
  Logger.log('API_TOKEN = ' + t);
  return t;
}

function doPost(e) {
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var token = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
    if (!token || req.token !== token) throw new Error('Unauthorized');

    var a = req.args || [];
    var data;
    switch (req.fn) {
      case 'getLibraryPayload':      data = getLibraryPayload(!!a[0]); break;
      case 'saveBook':               data = saveBook(a[0]); break;
      case 'addNewBook':             data = addNewBook(a[0]); break;
      case 'updateBookStatus':       data = updateBookStatus(a[0]); break;
      case 'deleteBook':             data = deleteBook(a[0]); break;
      case 'saveWishlistBook':       data = saveWishlistBook(a[0]); break;
      case 'deleteWishlistBook':     data = deleteWishlistBook(a[0]); break;
      case 'updatePerson':           data = updatePerson(a[0]); break;
      case 'addPerson':              data = addPerson(a[0]); break;
      case 'deletePerson':           data = deletePerson(a[0]); break;
      case 'addAdminConfigItem':     data = addAdminConfigItem(a[0], a[1]); break;
      case 'exportAllSheetsBackupCsv': data = exportAllSheetsBackupCsv(); break;
      case 'importAllSheetsBackupCsv': data = importAllSheetsBackupCsv(a[0]); break;
      case 'exportBooksCsv':         data = exportBooksCsv(); break;
      case 'exportLentSummaryCsv':   data = exportLentSummaryCsv(); break;
      case 'exportPersonsLedgerCsv': data = exportPersonsLedgerCsv(); break;
      default: throw new Error('Unknown function: ' + req.fn);
    }
    out = { ok: true, data: data };
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
