const pProps = require('p-props');
const execa = require('execa');
const gitParseCommit = require('git-parse-commit');

const commitStartRe = /^(\u0000){0,1}([0-9a-fA-F]{40})/;

const metaP = pProps({
  sha: execa('git', ['rev-list', '--max-count=1', 'HEAD']).then(r => r.stdout),
  ref: execa('git', ['describe', '--contains', '--all', 'HEAD']).then(r => r.stdout),
  commits: execa('git', ['rev-list', '--max-count=5', 'HEAD']).then(r => {
    const lines = r.sdtout.split('\n');

    return lines.reduce((commits, line) => {
      if (line === '\u0000' || commitStartRe.test(line)) {
        // new commits
        commits.push(line);
      }
      commits[commits.length - 1] += '\n' + line;

      return commits;
    }, []).map(gitParseCommit);
  })
})

metaP.then(console.log)
