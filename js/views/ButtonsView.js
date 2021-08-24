'use strict';

var
	_ = require('underscore'),
	ko = require('knockout'),
	
	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js'),

	WindowOpener = require('%PathToCoreWebclientModule%/js/WindowOpener.js')
;

/**
 * @constructor
 */
function ButtonsView()
{

}

ButtonsView.prototype.ViewTemplate = '%ModuleName%_ButtonsView';

ButtonsView.prototype.useFilesViewData = function (oFilesView)
{
	this.storageType = oFilesView.storageType;
	this.listCheckedAndSelected = oFilesView.selector.listCheckedAndSelected;
	this.checkedReadyForOperations = oFilesView.checkedReadyForOperations;
	this.openWebtorrent = Utils.createCommand(this, function () {
		var oFile = this.listCheckedAndSelected()[0];
		WindowOpener.openTab('?/webtorrent/' + oFile.hash());
	}, function () {
		var oItem = this.listCheckedAndSelected().length === 1 ? this.listCheckedAndSelected()[0] : null;
		return	!oFilesView.isZipFolder() && oItem && oItem.IS_FILE === true && !oItem.bIsSecure() &&
				Utils.getFileExtension(oItem.fileName()) === 'torrent' && this.checkedReadyForOperations();
	});
};

module.exports = new ButtonsView();
