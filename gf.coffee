#!/usr/bin/env coffee

#cli = require 'cheerio-httpcli'
cli = require './index'
cli.debug = true
cli.followMetaRefresh = false
word = 'typescript'
cli.fetch 'https://www.google.co.jp/search', { q: word, oq: word }, (err, $, res, body) ->
  console.log err
  console.log body
