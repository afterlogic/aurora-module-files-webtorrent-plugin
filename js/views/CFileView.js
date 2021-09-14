'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),
	WebTorrent = require('modules/%ModuleName%/js/vendors/webtorrent.min.js'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),
	UrlUtils = require('%PathToCoreWebclientModule%/js/utils/Url.js'),
	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js'),

	AlertPopup = require('%PathToCoreWebclientModule%/js/popups/AlertPopup.js'),
	App = require('%PathToCoreWebclientModule%/js/App.js'),
	CJua = require('%PathToCoreWebclientModule%/js/CJua.js'),
	Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),

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
	
	this.bMagnetLink = _.isEmpty(Settings.PublicFileData);
	this.sStorage = this.bMagnetLink ? '' : Types.pString(Settings.PublicFileData.Type);
	this.sPath = this.bMagnetLink ? '' : Types.pString(Settings.PublicFileData.Path);
	this.magnetLink = ko.observable('');
	
	this.downloadStarted = ko.observable(false);
	this.downloadFromMagnetCommand = Utils.createCommand(this, this.downloadFromMagnet, function () {
		return !this.downloadStarted();
	});
	
	this.uploadTorrentPercent = ko.observable(0);
	this.torrentUploaded = ko.computed(function () {
		return this.uploadTorrentPercent() === 100;
	}, this);
	this.isTorrentSaving = ko.observable(false);
	this.saveTorrentToFilesCommand = Utils.createCommand(this, this.saveTorrentToFiles, function () {
		return !this.isTorrentSaving() && !this.torrentUploaded();
	});
	
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

CFileView.prototype.onRoute = function (aParams)
{
	var
		sStorage = '',
		sPath = '',
		iIndex = 0
	;
	if (aParams[iIndex] === 'storage' && aParams[iIndex + 1])
	{
		sStorage = aParams[iIndex + 1];
		iIndex += 2;
	}
	if (aParams[iIndex] === 'path' && aParams[iIndex + 1])
	{
		sPath = aParams[iIndex + 1];
		iIndex += 2;
	}
	this.sStorage = sStorage;
	this.sPath = sPath;
};

CFileView.prototype.isValidMagnetLink = function ()
{
	if (_.isEmpty(this.magnetLink()))
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_MAGNET_LINK_EMPTY'), true);
		return false;
	}
	return true;
};

CFileView.prototype.downloadFromMagnet = function ()
{
	if (this.isValidMagnetLink())
	{
		this.download(this.magnetLink());
	}
};

CFileView.prototype.onShow = function ()
{
	if (!this.bMagnetLink)
	{
		var
			oActions = Settings.PublicFileData.Actions,
			sDownloadUrl = Types.pString(oActions && oActions.download && oActions.download.url)
		;
		if (_.isEmpty(sDownloadUrl))
		{
			Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_TORRENT_DOWNLOAD_URL_EMPTY'), true);
		}
		else
		{
			this.download(UrlUtils.getAppPath() + sDownloadUrl);
		}
	}
};

CFileView.prototype.getWebTorrentClient = function ()
{
	var oClient = new WebTorrent();

	oClient.on('error', function (err) {
	  Screens.showError(TextUtils.i18n('COREWEBCLIENT/ERROR_UNKNOWN') + ' (' + err.message + ')', true);
	});
	
	return oClient;
};

CFileView.prototype.download = function (sUrl)
{
	var oClient = this.getWebTorrentClient();

	oClient.add(sUrl, function (oTorrent) {
		this.downloadStarted(true);
		var oFile = oTorrent.files.find(function (oFile) {
			return oFile.name.endsWith('.mp4');
		});
		console.log('oTorrent', oTorrent);
		console.log('oFile', oFile);
		this.aTorrentFile = oTorrent.torrentFile;
		this.sTorrentName = oTorrent.name;
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

CFileView.prototype.saveTorrentToFiles = function () {
	function saveTorrentToFiles() {
		var oFile = new File([this.aTorrentFile], this.sTorrentName + '.torrent');
		this.uploadFile(oFile, this.isTorrentSaving, this.onTorrentUploadProgress, this.onTorrentUploadComplete);
	}

	if (this.aTorrentFile)
	{
		saveTorrentToFiles.call(this);
	}
	else if (this.isValidMagnetLink())
	{
		var oClient = this.getWebTorrentClient();

		oClient.add(this.magnetLink(), function (oTorrent) {
			this.aTorrentFile = oTorrent.torrentFile;
			this.sTorrentName = oTorrent.name;
			saveTorrentToFiles.call(this);
		}.bind(this));
	}
};

CFileView.prototype.saveToFiles = function () {
	this.uploadFile(this.file(), this.isSaving, this.onFileUploadProgress, this.onFileUploadComplete);
};

CFileView.prototype.uploadFile = function (oFile, koIsSaving, onFileUploadProgress, onFileUploadComplete) {
	var
		sFileName = oFile.name,
		sFileSize = oFile.size
	;

	if (Settings.EnableUploadSizeLimit && sFileSize/(1024*1024) > Settings.UploadSizeLimitMb)
	{
		Popups.showPopup(AlertPopup, [
			TextUtils.i18n('FILESWEBCLIENT/ERROR_SIZE_LIMIT', { 'FILENAME': sFileName, 'SIZE': Math.floor(sFileSize / (1024 * 1024)) })
		]);
		return;
	}
	
	koIsSaving(true);

	var
		sType = this.sStorage,
		bCanSaveToStorage = sType === Enums.FileStorageType.Personal || sType === Enums.FileStorageType.Corporate,
		sPath = this.sPath
	;

	if (!bCanSaveToStorage)
	{
		sType = Enums.FileStorageType.Personal;
		sPath = '';
	}

	var oJua = new CJua({
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
				console.log('oFile', oFile, 'sType', sType, 'sPath', sPath);
				return JSON.stringify({
					'Type': sType,
					'SubPath': '',
					'Path': sPath,
					'Overwrite': false
				});
			}
		}, App.getCommonRequestParameters())
	});

	oJua
		.on('onProgress', _.bind(onFileUploadProgress, this))
		.on('onComplete', _.bind(onFileUploadComplete, this))
	;

	oJua.addNewFile({
		File: oFile,
		FileName: sFileName,
		Folder: '',
		Size: sFileSize,
		Type: oFile.type
	});
};

CFileView.prototype.onFileUploadProgress = function (sFileUid, iUploadedSize, iTotalSize)
{
	this.uploadPercent(Math.floor((iUploadedSize / iTotalSize) * 100));
};

CFileView.prototype.onFileUploadComplete = function (sFileUid, bResponseReceived, oResult)
{
	this.isSaving(false);
	var
		bError = !bResponseReceived || !oResult || !!oResult.ErrorCode || !oResult.Result || !!oResult.Result.Error || false,
		sError = (oResult && oResult.ErrorCode && oResult.ErrorCode === Enums.Errors.CanNotUploadFileLimit) ?
			TextUtils.i18n('COREWEBCLIENT/ERROR_UPLOAD_SIZE') :
			TextUtils.i18n('COREWEBCLIENT/ERROR_UPLOAD_UNKNOWN')
	;
	if (bError)
	{
		Screens.showError(sError, true);
		this.uploadPercent(0);
	}
	else
	{
		Screens.showReport(TextUtils.i18n('%MODULENAME%/REPORT_FILE_UPLOAD'));
	}
};

CFileView.prototype.onTorrentUploadProgress = function (sFileUid, iUploadedSize, iTotalSize)
{
	this.uploadTorrentPercent(Math.floor((iUploadedSize / iTotalSize) * 100));
};

CFileView.prototype.onTorrentUploadComplete = function (sFileUid, bResponseReceived, oResult)
{
	this.isTorrentSaving(false);
	var
		bError = !bResponseReceived || !oResult || !!oResult.ErrorCode || !oResult.Result || !!oResult.Result.Error || false,
		sError = (oResult && oResult.ErrorCode && oResult.ErrorCode === Enums.Errors.CanNotUploadFileLimit) ?
			TextUtils.i18n('COREWEBCLIENT/ERROR_UPLOAD_SIZE') :
			TextUtils.i18n('COREWEBCLIENT/ERROR_UPLOAD_UNKNOWN')
	;
	if (bError)
	{
		Screens.showError(sError, true);
		this.uploadTorrentPercent(0);
	}
	else
	{
		Screens.showReport(TextUtils.i18n('%MODULENAME%/REPORT_TORRENT_UPLOAD'));
	}
};

module.exports = CFileView;
