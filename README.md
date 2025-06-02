// :::::::::::::::::::: VOTING-TEST-PROJECT 2 :::::::::::::::::::: //

Empowering secure, transparent voting for everyone.

OVERVIEW :

This project aims to simplify the Ethereum development workflow while ensuring robust contract functionality. The core features include:

- Smart Contract Development: Leverage OpenZeppelin and Hardhat for secure and efficient contract creation.
- Comprehensive Testing Framework: Validate voter registration and voting processes to ensure reliability.
- Seamless Deployment: Effortlessly deploy across local, testnets, and mainnet with optimized configurations.
- Environment Management: Manage environment variables and analyze code coverage for cleaner codebases.
- User-Friendly Commands: Access essential commands for testing and deploying contracts, perfect for developers of all levels.

Getting Started

Prerequisites

This project requires the following dependencies:

Programming Language: Javascript
Package Manager: Npm

Last commit : voting.js

1. Fixtures multiples : J'ai créé plusieurs fixtures pour différents états du contrat (déploiement simple, avec votants, avec propositions, avec votes etc..)

2. Tests des événements : Utilisation de expect().to.emit() pour vérifier les événements

3. Tests des erreurs : Utilisation de revertedWith() et revertedWithCustomError() --> ("OwnableUnauthorizedAccount")

4. Tests des getters et des workflows

Principales fonctionnalités testées :

- Deploy : État initial, propriétaire
- addVoters : Ajout, événements, require
- addProposal : Ajout, GENESIS, workflow
- setVote : Vote simple, require, comptage
- tally : Détermination du gagnant
- Getters : Accès aux informations
- Workflows
