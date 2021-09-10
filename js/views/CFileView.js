'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),
	WebTorrent = require('modules/%ModuleName%/js/vendors/webtorrent.min.js'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	UrlUtils = require('%PathToCoreWebclientModule%/js/utils/Url.js'),
	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js'),

	App = require('%PathToCoreWebclientModule%/js/App.js'),
	CJua = require('%PathToCoreWebclientModule%/js/CJua.js'),

	Settings = require('modules/%ModuleName%/js/Settings.js'),

	CAbstractScreenView = require('%PathToCoreWebclientModule%/js/views/CAbstractScreenView.js')
;

/**
* @constructor
*/
function CFileView()
{
	CAbstractScreenView.call(this, '%ModuleName%');

	this.browserTitle = ko.observable(TextUtils.i18n('%MODULENAME%/HEADING_BROWSER_TAB'));

	this.fileName = ko.observable('');
	this.fileSize = ko.observable('');
	this.file = ko.observable(null);

	this.hasNoSource = ko.observable(false);

	this.downloadPercent = ko.observable(0);
	this.downloaded = ko.computed(function () {
		return this.downloadPercent() === 100;
	}, this);
	this.downloadText = ko.computed(function () {
		return TextUtils.i18n('%MODULENAME%/INFO_DOWNLOADED_PERCENT', {'PERCENT': this.downloadPercent()});
	}, this);

	this.peersCount = ko.observable(0);
	this.peersText = ko.computed(function () {
		return TextUtils.i18n('%MODULENAME%/INFO_SEEDING_TO_PEERS_PLURAL', {'COUNT': this.peersCount()}, null, this.peersCount());
	}, this);
	
	this.isSaving = ko.observable(false);
	this.saveToFilesCommand = Utils.createCommand(this, this.saveToFiles, function () {
		return !!this.file() && !this.isSaving() && !this.uploaded();
	});
	
	this.uploadPercent = ko.observable(0);
	this.uploaded = ko.computed(function () {
		return this.uploadPercent() === 100;
	}, this);
	this.uploadText = ko.computed(function () {
		return TextUtils.i18n('%MODULENAME%/INFO_UPLOADED_PERCENT', {'PERCENT': this.uploadPercent()});
	}, this);

	this.peersCount = ko.observable(0);
	this.peersText = ko.computed(function () {
		return TextUtils.i18n('%MODULENAME%/INFO_SEEDING_TO_PEERS_PLURAL', {'COUNT': this.peersCount()}, null, this.peersCount());
	}, this);
}

_.extendOwn(CFileView.prototype, CAbstractScreenView.prototype);

CFileView.prototype.ViewTemplate = '%ModuleName%_FileView';
CFileView.prototype.ViewConstructorName = 'CFileView';

CFileView.prototype.onShow = function ()
{
	var
		sUrl = UrlUtils.getAppPath() + Settings.PublicFileData.Actions.download.url,
		oClient = new WebTorrent()
	;

	oClient.add(sUrl, function (oTorrent) {
		var oFile = oTorrent.files.find(function (oFile) {
			return oFile.name.endsWith('.mp4');
		});
		console.log('oTorrent', oTorrent);
		console.log('oFile', oFile);
		this.fileName(oFile.name);
		this.fileSize(TextUtils.getFriendlySize(oFile.length));
		
		setInterval(this.onProgress.bind(this, oTorrent), 500);
		oTorrent.on('done', this.onDone.bind(this, oFile));

		oFile.appendTo('#file-from-torrent');
		$('#file-from-torrent video').addClass('vjs-tech');
	}.bind(this));
};

CFileView.prototype.onProgress = function (oTorrent)
{
	this.hasNoSource(oTorrent.wires.length === 0);
	this.downloadPercent(Math.floor(oTorrent.progress * 100));
	this.peersCount(oTorrent.numPeers);
};

CFileView.prototype.onDone = function (oFile) {
	oFile.getBlob(function (oError, oBlob) {
		this.file(new File([oBlob], this.fileName()));
	}.bind(this));
};

CFileView.prototype.saveToFiles = function () {
	this.isSaving(true);
	
	var
		sType = Settings.PublicFileData.Type,
		bCanSaveToStorage = sType === Enums.FileStorageType.Personal || sType === Enums.FileStorageType.Corporate,
		sPath = Settings.PublicFileData.Path
	;

	if (!bCanSaveToStorage)
	{
		sType = Enums.FileStorageType.Personal;
		sPath = '';
	}

	this.oJua = new CJua({
		'action': '?/Api/',
		'name': 'jua-uploader',
		'queueSize': 2,
		'disableAjaxUpload': false,
		'disableFolderDragAndDrop': true,
		'disableDragAndDrop': true,
		'hidden': _.extendOwn({
			'Module': 'Files',
			'Method': 'UploadFile',
			'Parameters':  function (oFile) {
				console.log('oFile', oFile);
				return JSON.stringify({
					'Type': sType,
					'SubPath': '',
					'Path': sPath,
					'Overwrite': false
				});
			}
		}, App.getCommonRequestParameters())
	});

	this.oJua
		.on('onProgress', _.bind(this.onFileUploadProgress, this))
		.on('onComplete', _.bind(this.onFileUploadComplete, this))
	;

	this.oJua.addNewFile({
		File: this.file(),
		FileName: this.fileName(),
		Folder: '',
		Size: this.fileSize(),
		Type: this.file().type
	});
};

CFileView.prototype.onFileUploadProgress = function (sFileUid, iUploadedSize, iTotalSize)
{
	this.uploadPercent(Math.floor((iUploadedSize / iTotalSize) * 100));
};

CFileView.prototype.onFileUploadComplete = function (sFileUid, bResponseReceived, oResult)
{
	console.log({sFileUid, bResponseReceived, oResult});
	this.isSaving(false);
};

module.exports = CFileView;
