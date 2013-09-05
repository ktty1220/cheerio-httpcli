#!/usr/bin/env node
/*jshint node:true */
'use strict';

var client = require('./lib/cheerio-httpcli');

// google-search
client.fetch('http://www.google.com/search', { q: 'node.js' }, function (err, $, res) {
  if (err) {
    return console.error(err);
  }

  var results = [];
  $('#rso .g').each(function (idx) {
    var $h3 = $(this).find('h3');
    results.push({
      title: $h3.text(),
      url: $h3.find('a').attr('href'),
      description: $(this).find('.st').text()
    });
  });

  console.log(results);
});
