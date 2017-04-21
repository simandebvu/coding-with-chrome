/**
 * @fileoverview Phaser Audio Blocks for Blockly.
 *
 * @license Copyright 2017 The Coding with Chrome Authors.
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
 * @author mbordihn@google.com (Markus Bordihn)
 */



/**
 * Play audio.
 */
Blockly.Blocks['phaser_audio_play'] = {
  init: function() {
    this.appendValueInput('variable')
        .appendField(Blockly.BlocksTemplate.point())
        .appendField(i18t('play audio'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(245);
    this.setTooltip('');
    this.setHelpUrl('');
  }
};


/**
 * Pause audio.
 */
Blockly.Blocks['phaser_audio_pause'] = {
  init: function() {
    this.appendValueInput('variable')
        .appendField(Blockly.BlocksTemplate.point())
        .appendField(i18t('pause audio'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(245);
    this.setTooltip('');
    this.setHelpUrl('');
  }
};


/**
 * Resume audio.
 */
Blockly.Blocks['phaser_audio_resume'] = {
  init: function() {
    this.appendValueInput('variable')
        .appendField(Blockly.BlocksTemplate.point())
        .appendField(i18t('resume audio'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(245);
    this.setTooltip('');
    this.setHelpUrl('');
  }
};


/**
 * Stop audio.
 */
Blockly.Blocks['phaser_audio_stop'] = {
  init: function() {
    this.appendValueInput('variable')
        .appendField(Blockly.BlocksTemplate.point())
        .appendField(i18t('stop audio'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(245);
    this.setTooltip('');
    this.setHelpUrl('');
  }
};