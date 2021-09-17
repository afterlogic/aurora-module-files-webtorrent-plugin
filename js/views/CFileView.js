'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js'),

	Screens = require('%PathToCoreWebclientModule%/js/Screens.js')
;

/**
 * @param {object} oTorrentFile
 * @param {object} oParent
 * @returns {CFileView}
 */
function CFileView(oTorrentFile, oParent)
{
	this.oTorrentFile = oTorrentFile;
	this.oParent = oParent;
	this.sName = oTorrentFile.name;
	this.sFriendlySize = TextUtils.getFriendlySize(oTorrentFile.length);
	this.bCanPreview = _.indexOf(['mp4', 'jpg', 'jpeg', 'png'], Utils.getFileExtension(oTorrentFile.name)) !== -1;
	this.previewCommand = Utils.createCommand(this, this.preview);
	
	this.downloadPercent = ko.observable(0);
	this.downloaded = ko.computed(function () {
		return this.downloadPercent() === 100;
	}, this);

	this.bSuppressSuccessOutput = false;
	this.isSaving = ko.observable(false);
	this.uploadPercent = ko.observable(0);
	this.uploaded = ko.computed(function () {
		return this.uploadPercent() === 100;
	}, this);
	this.allowUpload = ko.computed(function () {
		return this.downloaded() && !this.isSaving() && !this.uploaded();
	}, this);
	this.saveToFilesButtonText = ko.computed(function () {
		if (this.uploaded())
		{
			return TextUtils.i18n('%MODULENAME%/ACTION_SAVED_TO_FILES');
		}
		if (this.isSaving())
		{
			return TextUtils.i18n('%MODULENAME%/ACTION_SAVE_TO_FILES_IN_PROGRESS');
		}
		return TextUtils.i18n('%MODULENAME%/ACTION_SAVE_TO_FILES');
	}, this);
	this.saveToFilesCommand = Utils.createCommand(this, this.saveToFiles, this.allowUpload);
}

CFileView.prototype.preview = function ()
{
	var oFileFromTorrent = $('#file-from-torrent');
	oFileFromTorrent.empty();
	this.oTorrentFile.appendTo('#file-from-torrent');

	var
		oVideo = $('#file-from-torrent video'),
		oImg = $('#file-from-torrent img')
	;
	if (oVideo.length > 0)
	{
		oVideo[0].play();
	}
	if (oImg.length > 0)
	{
		oFileFromTorrent.css({ 'height': 'auto' });
	}
	else
	{
		oFileFromTorrent.css({ 'height': '360px' });
	}
	this.oParent.visiblePreview(true);
};

CFileView.prototype.saveToFiles = function (mSuppressSuccessOutput)
{
	this.bSuppressSuccessOutput = mSuppressSuccessOutput === true; // it can be object
	this.isSaving(true);
	this.uploadPercent(10);
	this.oTorrentFile.getBlob(function (oError, oBlob) {
		if (oBlob)
		{
			var oFile = new File([oBlob], this.sName);
			if (this.oParent.isValidFileSize(oFile))
			{
				var sSubPath = this.oParent.files().length === 1 ? '' : this.oParent.torrentName();
				this.oParent.uploadFile(oFile, sSubPath, this.onFileUploadProgress.bind(this),
										this.onFileUploadComplete.bind(this));
			}
			else
			{
				this.isSaving(false);
			}
		}
		else
		{
			this.isSaving(false);
			var sMessage = oError ? ' (' + oError.message + ')' : '';
			Screens.showError(TextUtils.i18n('COREWEBCLIENT/ERROR_UNKNOWN') + sMessage, true);
		}
	}.bind(this));
};

CFileView.prototype.onFileUploadProgress = function (sFileUid, iUploadedSize, iTotalSize)
{
	var iUploadPercent = Math.floor((iUploadedSize / iTotalSize) * 100);
	if (iUploadPercent < 10 && this.isSaving())
	{
		iUploadPercent = 10;
	}
	this.uploadPercent(iUploadPercent);
};

CFileView.prototype.onFileUploadComplete = function (sFileUid, bResponseReceived, oResult)
{
	this.isSaving(false);

	if (this.oParent.isUploadError(bResponseReceived, oResult))
	{
		this.uploadPercent(0);
	}
	else if (!this.bSuppressSuccessOutput)
	{
		Screens.showReport(TextUtils.i18n('%MODULENAME%/REPORT_FILE_UPLOAD'));
	}
};

module.exports = CFileView;
