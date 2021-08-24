'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),
	
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js')
;

/**
 * @constructor
 */
function COpenWebtorrentPopup()
{
	CAbstractPopup.call(this);
	
	this.fCallback = null;
	
	this.name = ko.observable('');
	this.focused = ko.observable(false);
	this.error = ko.observable('');
	this.name.subscribe(function () {
		this.error('');
	}, this);
}

_.extendOwn(COpenWebtorrentPopup.prototype, CAbstractPopup.prototype);

COpenWebtorrentPopup.prototype.PopupTemplate = '%ModuleName%_OpenWebtorrentPopup';

/**
 * @param {string} sName
 * @param {function} fCallback
 */
COpenWebtorrentPopup.prototype.onOpen = function (sName, fCallback)
{
	this.fCallback = fCallback;
	
	this.name(sName);
	this.focused(true);
	this.error('');
};

COpenWebtorrentPopup.prototype.onOKClick = function ()
{
	this.error('');
	
	if ($.isFunction(this.fCallback))
	{
		var sError = this.fCallback(this.name());
		if (sError)
		{
			this.error(sError);
		}
		else
		{
			this.closePopup();
		}
	}
	else
	{
		this.closePopup();
	}
};

module.exports = new COpenWebtorrentPopup();