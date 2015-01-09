#!/usr/bin/env coffee

fs = require 'fs'
jschardet = require '../../node_modules/jschardet'

detect = (file) ->
  enc = jschardet.detect fs.readFileSync(file)
  console.log file, enc

walk = (dir = '.') ->
  for f in fs.readdirSync dir
    path = "#{dir}/#{f}"
    if fs.lstatSync(path).isDirectory()
      walk path
    else if /\.html$/i.test f
      detect path

walk()
