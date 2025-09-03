# Documentation for <br> SAP Cloud Application Programming Model

[![REUSE status](https://api.reuse.software/badge/github.com/capire/docs)](https://api.reuse.software/info/github.com/capire/docs)

## About this project

This repository contains the core parts of the **documentation pages** for the SAP Cloud Application Programming Model. As a short name, we refer to the documentation as _Capire_.

Along with additional SAP-specific pages the content is published to https://cap.cloud.sap on a regular basis.

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports, etc. via [GitHub issues](https://github.com/capire/docs/issues) and [pull requests](https://github.com/capire/docs/pulls). Contribution and feedback are encouraged and always welcome.

See our [contribution guidelines](CONTRIBUTING.md) for information about how to contribute, the project structure, as well as additional contribution information.

## Running Locally

If you contribute often to the documentation it's best to create your own fork, clone it to your local machine.

```sh
git clone https://github.com/capire/docs   # or whatever your fork's URL is
```

Install the dependencies:

```sh
npm run setup
```

Start the local server:

```sh
npm run start
```

This will respond with:
```sh
  vitepress v1...

  ➜  Local:   http://localhost:5173/docs/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

Once this is running, if you are reading this documentation at https://cap.cloud.sap/,
- press <kbd>l</kbd> to open the page on _localhost_
- and then press <kbd>o</kbd> to open the page in your local VS Code

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](CODE_OF_CONDUCT.md) at all times.

## Licensing

Copyright 2023-2025 SAP SE or an SAP affiliate company and CAP contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/SAP/capire/docs).
