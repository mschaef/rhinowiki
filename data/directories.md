title:Working with Directories

This is a script that takes you to the top level directory of a git
project.

```bash
function cdtop() {
    local git_root;

    git_root=`git rev-parse --show-toplevel`;

    if [ $? -eq 0 ]
    then
        cd ${git_root}
    else
        return 1
    fi
}
```

Here's a git alias that does something similar:

```bash
git config --global alias.exec '!exec '
```

http://stackoverflow.com/questions/957928/is-there-a-way-to-get-the-git-root-directory-in-one-command