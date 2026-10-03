# Terminal demo for the README. Render from the repository root:
#   vhs docs/demo.tape
# Scaffolds a fake platform ("Nova 3") from a clean clone under /tmp.

Output docs/demo.gif

Set Shell "bash"
Set FontSize 18
Set Width 1300
Set Height 700
Set Padding 16
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms
Set Framerate 12

Hide
Type `export BASH_SILENCE_DEPRECATION_WARNING=1 PS1='$ ' D=/tmp/launch-day-kit-demo` Enter
Type `rm -rf $D && mkdir -p $D/home && git clone -q "$PWD" $D/launch-day-kit && cd $D/launch-day-kit` Enter
Type `export HOME=$D/home LAUNCH_OWNER=your-org GIT_AUTHOR_NAME=demo GIT_AUTHOR_EMAIL=demo@example.com GIT_COMMITTER_NAME=demo GIT_COMMITTER_EMAIL=demo@example.com` Enter
Type `export NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false && clear` Enter
Sleep 1s
Show

Type `node bin/new-launch.mjs --platform "Nova 3" --slug nova-router --template model-router --out ../nova-router`
Sleep 800ms
Enter
Sleep 3s
Type "cd ../nova-router && npm install --silent && npm test"
Sleep 800ms
Enter
Sleep 8s
