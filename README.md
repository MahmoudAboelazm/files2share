# Files2share

<a href="https://files2share.netlify.app/" target="_blank">Files2share</a> is a
web app for sharing files between the devices on your local network without
uploading them to any server, it's peer-to-peer using WebRTC.

> Inspired by
> <a href="https://github.com/RobinLinus/snapdrop" target="_blank">Snapdrop</a>

Prevent duplicate option to prevent transfer files already exist on your device.

## Built with:

- Typescript, HTML, CSS
- WebRTC
- Webpack
- streamSaver
- DiceBear
- Nodejs / SSE
- Progressive Web App

## How to run on your machine

### `Client`

Navigate to `/client`, create an `.env` file and set the following environment
variable:

```
SERVER_URL=http://localhost:4000
```

Run

1. Install the dependencies with:

```shell
yarn
```

2. Run start:

```shell
yarn start
```

### `Server`

Navigate to `/server`

Run

1. Install the dependencies with:

```shell
yarn
```

2. Watch for file changes:

```shell
yarn watch
```

3. Run dev:

```shell
yarn dev
```

## Contributions

It's opening to receive any kind of contribution, report issue, fix a bug or any
kind of enhancement you can see & there's a todo list inside
`/client/src/index.ts`, you can start with if you would like or you can suggest
a new one.

1. Fork this repository to your own GitHub account and then clone it to your
   local device.
2. Create a new branch: `git checkout -b MY_BRANCH_NAME`
3. You can now push to your own branch and open a pull request.
