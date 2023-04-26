# SETUSU-Vote
This repository will store the source code for my Final Year Project.

**Academic Title:** A Secure E-Vote Management System with Facial Recognition

**Commercial Title:** SETUSU Vote

## About the Project
SETUSU Vote is a secure e-vote management system, targeted specifically towards SETU’s Student Union.
The web application streamlines the voting process by handling voter registration, candidate promotion,
voting, and counting of the votes.

The system emphasises voter privacy and security throughout and offers an advanced authentication mechanism
that requires users to upload a valid photo of their student ID card upon registration and undergo facial
recognition before casting their vote to ensure the person attempting to vote matches the registered student.

The system is currently live at this URL: [https://setusu-vote.herokuapp.com/](https://setusu-vote.herokuapp.com/)

## Technologies
The system utilises the following key technologies:
+ Node.js
+ Express JS
+ MySQL
+ Amazon AWS

## Prerequisites
To run the source code locally, the following must be installed on target device:
- Node.js
- NPM

To connect to the database, an .env file must be added to the votesystem directory
containing credentials.

Similarly, credentials must be added to the .env file to access the AWS Rekognition
feature.

## How to Run
After downloading the source code and configuring the environment, run the following
commands from the votesytem directory:
```
npm install
npm start
```
Visit localhost:3000 to view the website.
