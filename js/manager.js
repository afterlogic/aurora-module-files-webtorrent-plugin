'use strict';

module.exports = function (oAppData) {
	var
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
				}
			};
		}
	}
	
	return null;
};
