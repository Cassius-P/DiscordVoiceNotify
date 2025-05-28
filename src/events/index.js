// Events index file
// This file exports all event handlers for easy importing

const ready = require('./ready');
const voiceStateUpdate = require('./voiceStateUpdate');
const messageReactionAdd = require('./messageReactionAdd');
const messageReactionRemove = require('./messageReactionRemove');
const interactionCreate = require('./interactionCreate');

module.exports = {
  ready,
  voiceStateUpdate,
  messageReactionAdd,
  messageReactionRemove,
  interactionCreate
};
