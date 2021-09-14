'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),

	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js'),
//	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),

	WindowOpener = require('%PathToCoreWebclientModule%/js/WindowOpener.js')
;

/**
 * @constructor
 */
function CDownloadFromMagnetButtonView(koStorageType, koCurrentPath)
{
	this.storageType = _.isFunction(koStorageType) ? koStorageType : ko.observable('');
	this.currentPath = _.isFunction(koCurrentPath) ? koCurrentPath : ko.observable('');

	this.allowCreateItems = ko.computed(function () {
		return	this.storageType() !== Enums.FileStorageType.Encrypted && this.storageType() !== Enums.FileStorageType.Shared;
	}, this);
	this.downloadFromMagnetCommand = Utils.createCommand(this, this.downloadFromMagnet, this.allowCreateItems);
}

CDownloadFromMagnetButtonView.prototype.ViewTemplate = '%ModuleName%_DownloadFromMagnetButtonView';

CDownloadFromMagnetButtonView.prototype.downloadFromMagnet = function ()
{
	var
		sStorage = this.storageType() ? '/storage/' + encodeURIComponent(this.storageType()) : '',
		sPath = this.currentPath() ? '/path/' + encodeURIComponent(this.currentPath()) : '',
		sHash = sStorage + sPath
	;
	WindowOpener.openTab('?/webtorrent' + (sHash ? '#' + sHash : ''));
};

module.exports = CDownloadFromMagnetButtonView;
