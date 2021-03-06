/**
 * @fileoverview Handles the communication with Makeblock mBots.
 *
 * This api allows to read and control the Makeblock mBot kits with
 * bluetooth connection.
 *
 * @license Copyright 2016 Shenzhen Maker Works Co, Ltd. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author wangyu@makeblock.cc (Yu Wang)
 */
goog.provide('cwc.protocol.makeblock.mbot.Api');

goog.require('cwc.protocol.bluetooth.classic.Events');
goog.require('cwc.protocol.makeblock.mbot.CallbackType');
goog.require('cwc.protocol.makeblock.mbot.Handler');
goog.require('cwc.protocol.makeblock.mbot.Monitoring');
goog.require('cwc.protocol.makeblock.mbot.Port');
goog.require('cwc.utils.ByteTools');
goog.require('cwc.utils.Events');
goog.require('cwc.utils.Logger');
goog.require('cwc.utils.StreamReader');

goog.require('goog.events.EventTarget');


/**
 * @constructor
 * @struct
 * @final
 */
cwc.protocol.makeblock.mbot.Api = function() {
  /** @type {string} */
  this.name = 'mBot';

  /** @type {Object} */
  this.device = null;

  /** @type {!cwc.protocol.makeblock.mbot.Handler} */
  this.handler = new cwc.protocol.makeblock.mbot.Handler();

  /** @type {boolean} */
  this.prepared = false;

  /** @type {!cwc.protocol.makeblock.mbot.Monitoring} */
  this.monitoring = new cwc.protocol.makeblock.mbot.Monitoring(this);

  /** @type {goog.events.EventTarget} */
  this.eventHandler = new goog.events.EventTarget();

  /** @private {!cwc.utils.Events} */
  this.events_ = new cwc.utils.Events(this.name);

  /** @private {Object} */
  this.sensorDataCache_ = {};

  /** @private {!cwc.utils.StreamReader} */
  this.streamReader_ = new cwc.utils.StreamReader()
    .setHeaders([0xff, 0x55])
    .setFooter([0x0d, 0x0a])
    .setMinimumSize(4);

  /** @private {!cwc.utils.Logger|null} */
  this.log_ = new cwc.utils.Logger(this.name);
};


/**
 * Connects the mbot.
 * @param {!cwc.protocol.bluetooth.classic.Device} device
 * @return {boolean} Was able to prepare and connect to the mbot.
 * @export
 */
cwc.protocol.makeblock.mbot.Api.prototype.connect = function(device) {
  if (!device) {
    this.log_.error('mBot is not ready yet...');
    return false;
  }

  if (!this.prepared && device.isConnected()) {
    this.log_.info('Preparing bluetooth api for', device.getAddress());
    this.device = device;
    this.prepare();
  }

  return true;
};


/**
 * @return {!boolean}
 * @export
 */
cwc.protocol.makeblock.mbot.Api.prototype.isConnected = function() {
  return (this.device && this.device.isConnected()) ? true : false;
};


/**
 * @export
 */
cwc.protocol.makeblock.mbot.Api.prototype.prepare = function() {
  this.events_.listen(this.device.getEventHandler(),
    cwc.protocol.bluetooth.classic.Events.Type.ON_RECEIVE,
    this.handleOnReceive_.bind(this));
  this.exec('playTone', {'frequency': 524, 'duration': 240});
  this.exec('playTone', {'frequency': 584, 'duration': 240});
  this.exec('getVersion');
  this.monitor(true);
  this.prepared = true;
};


/**
 * Disconnects the mbot.
 * @export
 */
cwc.protocol.makeblock.mbot.Api.prototype.disconnect = function() {
  if (this.device) {
    this.device.disconnect();
  }
  this.cleanUp();
};


/**
 * Executer for the default handler commands.
 * @param {!string} command
 * @param {Object=} data
 * @export
 */
cwc.protocol.makeblock.mbot.Api.prototype.exec = function(command, data = {}) {
  this.send(this.handler[command](data));
};


/**
 * @param {!Array<ArrayBuffer>|ArrayBuffer} buffer
 * @private
 */
cwc.protocol.makeblock.mbot.Api.prototype.send = function(buffer) {
  if (this.device) {
    this.device.send(buffer);
  }
};


/**
 * @param {!string} command
 * @param {Object=} data
 * @return {!ArrayBuffer}
 * @export
 */
cwc.protocol.makeblock.mbot.Api.prototype.getBuffer = function(
    command, data = {}) {
  return this.handler[command](data);
};


/**
 * @return {goog.events.EventTarget}
 * @export
 */
cwc.protocol.makeblock.mbot.Api.prototype.getEventHandler = function() {
  return this.eventHandler;
};


/**
 * Basic cleanup for the mBot unit.
 */
cwc.protocol.makeblock.mbot.Api.prototype.cleanUp = function() {
  this.log_.info('Clean up ...');
  this.reset();
  this.events_.clear();
  this.monitoring.cleanUp();
};


/**
 * Resets the mbot connection and cache.
 * @export
 */
cwc.protocol.makeblock.mbot.Api.prototype.reset = function() {
  this.sensorDataCache_ = {};
  if (this.device) {
    this.exec('stop');
    this.device.reset();
  }
};


/**
 * @param {!boolean} enable
 * @export
 */
cwc.protocol.makeblock.mbot.Api.prototype.monitor = function(enable) {
  if (enable && this.isConnected()) {
    this.monitoring.start();
  } else if (!enable) {
    this.monitoring.stop();
  }
};


/**
 * Convert float bytes to float value in robot response;
 * @param  {Array} dataBytes bytes from the robot
 * @return {number} float value
 * @private
 */
cwc.protocol.makeblock.mbot.Api.prototype.parseFloatBytes_ = function(
    dataBytes) {
  let intValue = this.fourBytesToInt_(
    dataBytes[3], dataBytes[2], dataBytes[1], dataBytes[0]);
  let result = parseFloat(this.intBitsToFloat_(intValue).toFixed(2));
  return result;
};


/**
 * Convert four bytes (b4b3b2b1) to a single int.
 * @param {number} b1
 * @param {number} b2
 * @param {number} b3
 * @param {number} b4
 * @return {number} the result int
 * @private
 */
cwc.protocol.makeblock.mbot.Api.prototype.fourBytesToInt_ = function(b1, b2, b3,
    b4) {
  return ( b1 << 24 ) + ( b2 << 16 ) + ( b3 << 8 ) + b4;
};


/**
 * Convert from int (in byte form) to float
 * @param {number} num   the input int value
 * @return {number}     the result as float
 * @private
 */
cwc.protocol.makeblock.mbot.Api.prototype.intBitsToFloat_ = function(num) {
  /* s 为符号（sign）；e 为指数（exponent）；m 为有效位数（mantissa）*/
  let sign = ( num >> 31 ) == 0 ? 1 : -1;
  let exponent = ( num >> 23 ) & 0xff;
  let mantissa = ( exponent == 0 ) ?
    ( num & 0x7fffff ) << 1 : ( num & 0x7fffff ) | 0x800000;
  return sign * mantissa * Math.pow( 2, exponent - 150 );
};


/**
 * Handles packets from the Bluetooth socket.
 * @param {Event} e
 * @private
 */
cwc.protocol.makeblock.mbot.Api.prototype.handleOnReceive_ = function(e) {
  let data = this.streamReader_.readByHeaderAndFooter(e.data);
  if (!data) {
    return;
  }
  for (let i = 0, len = data.length; i < len; i++) {
    let dataBuffer = data[i];

    // Ignore empty and OK packages with 0xff, 0x55, 0x0d, 0x0a
    if (dataBuffer.length > 4) {
      this.handleData_(dataBuffer);
    }
  }
};


/**
 * Handles the single data packages.
 * @param {!Uint8Array} dataBuffer
 * @private
 */
cwc.protocol.makeblock.mbot.Api.prototype.handleData_ = function(dataBuffer) {
  let len = dataBuffer[1];
  let indexType = dataBuffer[2];
  let dataType = dataBuffer[3];
  let data = dataBuffer.slice(4, dataBuffer.length);
  switch (indexType) {
    case cwc.protocol.makeblock.mbot.CallbackType.VERSION:
      this.log_.info('mBot Firmware', new TextDecoder('utf-8').decode(data));
      break;
    case cwc.protocol.makeblock.mbot.CallbackType.ULTRASONIC:
    case cwc.protocol.makeblock.mbot.CallbackType.LINEFOLLOWER:
    case cwc.protocol.makeblock.mbot.CallbackType.LIGHTSENSOR:
      this.handleSensorData_(indexType, data, 4);
      break;
    case cwc.protocol.makeblock.mbot.CallbackType.INNER_BUTTON:
      this.handleSensorData_(indexType, data);
      break;
    default:
      this.log_.info('UNKNOWN index', len, indexType, dataType, dataBuffer);
  }
};


/**
 * Handles the different type of sensor data.
 * @param {!cwc.protocol.makeblock.mbot.CallbackType} index_type
 * @param {Array} data
 * @param {number=} opt_data_size
 * @private
 */
cwc.protocol.makeblock.mbot.Api.prototype.handleSensorData_ = function(
    index_type, data, opt_data_size) {
  if (opt_data_size && data.length < opt_data_size) {
    return;
  }

  if (this.sensorDataCache_[index_type] !== undefined &&
      cwc.utils.ByteTools.isArrayBufferEqual(
        this.sensorDataCache_[index_type], data)) {
    return;
  }
  this.sensorDataCache_[index_type] = data;

  switch (index_type) {
    case cwc.protocol.makeblock.mbot.CallbackType.INNER_BUTTON:
      this.dispatchSensorEvent_(index_type,
        cwc.protocol.makeblock.mbot.Events.ButtonPressed, data[0]);
      break;
    case cwc.protocol.makeblock.mbot.CallbackType.LIGHTSENSOR:
      this.dispatchSensorEvent_(index_type,
        cwc.protocol.makeblock.mbot.Events.LightnessSensorValue,
        this.parseFloatBytes_(data));
      break;
    case cwc.protocol.makeblock.mbot.CallbackType.LINEFOLLOWER:
      this.dispatchSensorEvent_(index_type,
        cwc.protocol.makeblock.mbot.Events.LinefollowerSensorValue, {
          'left': data[3] >= 64,
          'right': data[2] >= 64,
          'raw': data,
        });
      break;
    case cwc.protocol.makeblock.mbot.CallbackType.ULTRASONIC:
      this.dispatchSensorEvent_(index_type,
        cwc.protocol.makeblock.mbot.Events.UltrasonicSensorValue,
        this.parseFloatBytes_(data));
      break;
  }
};


/**
 * Dispatch event for sensor data change.
 * @param {!cwc.protocol.makeblock.mbot.CallbackType} index
 * @param {!Function} event
 * @param {Object|number} data
 * @private
 */
cwc.protocol.makeblock.mbot.Api.prototype.dispatchSensorEvent_ = function(
    index, event, data) {
  this.eventHandler.dispatchEvent(event(data));
};
