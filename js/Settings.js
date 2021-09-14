'use strict';

var
	_ = require('underscore'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js')
;

module.exports = {
	PublicFileData: {},
	
	EnableUploadSizeLimit: false,
	UploadSizeLimitMb: 0,
	
	/**
	 * Initializes settings from AppData object sections.
	 * 
	 * @param {Object} oAppData Object contained modules settings.
	 */
	init: function (oAppData)
	{
		var oAppDataSection = oAppData['%ModuleName%'];

		if (!_.isEmpty(oAppDataSection))
		{
			this.PublicFileData = Types.pObject(oAppDataSection.PublicFileData);
		}
		
		var oAppDataFilesSection = oAppData['Files'];
		if (!_.isEmpty(oAppDataFilesSection))
		{
			this.EnableUploadSizeLimit = Types.pBool(oAppDataFilesSection.EnableUploadSizeLimit, this.EnableUploadSizeLimit);
			this.UploadSizeLimitMb = Types.pNonNegativeInt(oAppDataFilesSection.UploadSizeLimitMb, this.UploadSizeLimitMb);
		}		
	}
};
