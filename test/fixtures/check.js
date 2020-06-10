#!/usr/bin/env node

const fs = require('fs');
const jschardet = require('jschardet');

const detect = (file) => {
  const enc = jschardet.detect(fs.readFileSync(file));
  console.log(file, enc);
};

const walk = (dir = '.') => {
  const files = fs.readdirSync(dir);
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const path = `${dir}/${f}`;
    if (fs.lstatSync(path).isDirectory()) {
      walk(path);
    } else if (/\.html$/i.test(f)) {
      detect(path);
    }
  }
};

walk();
