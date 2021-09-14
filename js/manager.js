'use strict';

module.exports = function (oAppData) {
	var
		_ = require('underscore'),

		App = require('%PathToCoreWebclientModule%/js/App.js'),

		Settings = require('modules/%ModuleName%/js/Settings.js')
	;

	Settings.init(oAppData);
	if (App.isUserNormalOrTenant())
	{
		if (App.isPublic())
		{
			if (App.isMobile())
			{
				require('node_modules/framework7/dist/css/framework7.material.css');
			}

			return {
				start: function (ModulesManager) {
					require('modules/FilesWebclient/js/enums.js');
				},
				getScreens: function () {
					var oScreens = {};
					oScreens['file-view'] = function () {
						var CFileView = require('modules/%ModuleName%/js/views/CFileView.js');
						return new CFileView();
					};
					return oScreens;
				}
			};
		}
		else
		{
			return {
				start: function (ModulesManager) {
					ModulesManager.run('FilesWebclient', 'registerToolbarButtons', [require('modules/%ModuleName%/js/views/ButtonsView.js')]);
					App.subscribeEvent('FilesWebclient::ConstructView::after', function (oParams) {
						if (oParams.Name === 'CFilesView') {
							var oView = oParams.View;
							if (oView && _.isFunction(oView.registerCreateButtonsController))
							{
								setTimeout(function () {
									var CDownloadFromMagnetButtonView = require('modules/%ModuleName%/js/views/CDownloadFromMagnetButtonView.js');
									oView.registerCreateButtonsController(new CDownloadFromMagnetButtonView(oView.storageType, oView.currentPath));
								});
							}
						}
					});
				}
			};
		}
	}
	
	return null;
};
