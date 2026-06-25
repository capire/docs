# Contributing

## Contributing through GitHub UI

Use the _Edit this page_ button at the bottom of each page.  This will lead you to the source `md` file.

## Local Setup

For bigger changes, we recommend running the pages locally:

```sh
git clone https://github.com/cap-js/docs capire
cd capire
npm run setup
```

Prerequisite is a Node.js version >= 18.

### Start Dev Server

Just run

```sh
npm run docs:dev
```

Which usually starts a dev server on http://localhost:5173/ like this:

```sh
  vitepress v1.0.0...

  ➜  Local:   http://localhost:5173/
```

Now just edit content and the server will immediately show it.

### Preview Build

If you want to run a proper full monty build, do this:

```sh
npm run docs:build
```

The results are created in folder `.vitepress/dist/`

Then you can spawn up a 'preview' server on http://localhost:4173 that serves this build result:

```sh
npm run docs:preview
```

Note that this is _not_ the same as the dev server as it doesn't react to source code changes.


## Code of Conduct

All members of the project community must abide by the [Contributor Covenant, version 2.1](CODE_OF_CONDUCT.md).
Only by respecting each other we can develop a productive, collaborative community.
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting [a project maintainer](.reuse/dep5).

## Engaging in Our Project

We use GitHub to manage reviews of pull requests.

* If you are a new contributor, see: [Steps to Contribute](#steps-to-contribute)

* Before implementing your change, create an issue that describes the problem you would like to solve or the code that should be enhanced. Please note that you are willing to work on that issue.

* The team will review the issue and decide whether it should be implemented as a pull request. In that case, they will assign the issue to you. If the team decides against picking up the issue, the team will post a comment with an explanation.

## Issues and Planning

We use GitHub issues to track bugs and enhancement requests.

Please provide as much context as possible when you open an issue. The information you provide must be comprehensive enough to reproduce that issue for the assignee.

## Steps to Contribute

Should you wish to work on an issue, please claim it first by commenting on the GitHub issue that you want to work on. This is to prevent duplicated efforts from other contributors on the same issue.

If you have questions about one of the issues, please comment on them, and one of the maintainers will clarify.

## Contributing Code or Documentation

You are welcome to contribute code in order to fix a bug or to implement a new feature that is logged as an issue.

The following rule governs code contributions:

* Contributions must be licensed under the [Apache 2.0 License](./LICENSE)
* Due to legal reasons, contributors will be asked to accept a Developer Certificate of Origin (DCO) when they create the first pull request to this project. This happens in an automated fashion during the submission process. SAP uses [the standard DCO text of the Linux Foundation](https://developercertificate.org/).
