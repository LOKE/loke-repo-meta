'use strict';

const execa = require('execa');
const findUp = require('find-up');
const loadJsonFile = require('load-json-file');
const readPkgUp = require('read-pkg-up');
const gitParseCommit = require('git-parse-commit');
const Negotiator = require('negotiator');

const commitStartRe = /^(\u0000){0,1}([0-9a-fA-F]{40})/;

const LOKE_META_FILENAME = exports.LOKE_META_FILENAME = 'loke-meta.json'

exports.getMeta = function (cwd) {
  const {pkg} = readPkgUp.sync({cwd});
  const {name, description, version} = pkg;
  const {sha, ref, commits} = getGitMeta(cwd);

  return {name, description, version, sha, ref, commits};
}

exports.createHandler = function (cwd) {
  const meta = exports.getMeta(cwd);
  const availableMediaTypes = ['application/json', 'text/html'];

  return function (req, res) {
    const negotiator = new Negotiator(request)
    const type = negotiator.mediaType(availableMediaTypes)
    let response;

    switch (type) {
      case 'text/html':
        res.setHeader('Content-Type', 'text/html');
        response = template(meta);
        break;
      case 'application/json':
        res.setHeader('Content-Type', 'application/json');
        response = JSON.stringify(meta);
        break;
      default:
        res.statusCode = 406; // 406?
        response = `Invalid accept type, vaild types are: ${availableMediaTypes.join(', ')}\n`;
    }

    res.end(response);
  }
}

exports.generateGitMeta = function (cwd) {
  const gitDir = findUp.sync('.git', {cwd});
  const sha = execa.sync('git', [`--git-dir=${gitDir}`, 'rev-list', '--max-count=1', 'HEAD']).stdout;
  const ref = execa.sync('git', [`--git-dir=${gitDir}`, 'rev-parse', '--abbrev-ref', 'HEAD']).stdout;
  const revList = execa.sync('git', [`--git-dir=${gitDir}`, 'rev-list', '--header', '--max-count=5', 'HEAD']).stdout;

  const commits = parseCommits(revList);

  return {
    sha,
    ref,
    commits
  };
}

function getGitMeta(cwd) {
  const metaPath = findUp.sync(LOKE_META_FILENAME, {cwd});

  if (metaPath) {
    return loadJsonFile.sync(metaPath)
  }
  return exports.generateGitMeta(cwd);
}

function parseCommits(refList) {
  const lines = refList.split('\n');

  return lines.reduce((commits, line) => {
    if (commitStartRe.test(line)) {
      // new commits
      commits.push(line);
    } else {
      commits[commits.length - 1] += '\n' + line;
    }

    return commits;
  }, [])
  .map(gitParseCommit);
}
