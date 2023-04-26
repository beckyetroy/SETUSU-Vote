-- MySQL dump 10.13  Distrib 8.0.31, for Win64 (x86_64)
--
-- Host: localhost    Database: setusuvote
-- ------------------------------------------------------
-- Server version	8.0.31

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_credentials`
--

DROP TABLE IF EXISTS `admin_credentials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_credentials` (
  `UserName` varchar(250) NOT NULL,
  `Password` varchar(250) NOT NULL,
  `Salt` varchar(500) DEFAULT NULL,
  `LoginAttempts` int DEFAULT '0',
  `BlockExpiration` datetime DEFAULT NULL,
  PRIMARY KEY (`UserName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_credentials`
--

LOCK TABLES `admin_credentials` WRITE;
/*!40000 ALTER TABLE `admin_credentials` DISABLE KEYS */;
INSERT INTO `admin_credentials` VALUES ('beckyet19','$argon2id$v=19$m=65536,t=3,p=4$zEUecZo/1OBgG9jSPaPw/Q$bnzBWZd2HBSEBrqGE/NffWmjQRPU+N47kOIEg+wVtQQ','QV6fZzUpCKjGvnLW',0,NULL);
/*!40000 ALTER TABLE `admin_credentials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `agenda`
--

DROP TABLE IF EXISTS `agenda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agenda` (
  `AgendaId` int NOT NULL AUTO_INCREMENT,
  `CandidateId` int NOT NULL,
  `CategoryId` int NOT NULL,
  `Summary` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`AgendaId`),
  KEY `CategoryId` (`CategoryId`),
  KEY `CandidateId` (`CandidateId`),
  CONSTRAINT `agenda_ibfk_1` FOREIGN KEY (`CategoryId`) REFERENCES `category` (`CategoryId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `agenda_ibfk_2` FOREIGN KEY (`CandidateId`) REFERENCES `candidate` (`CandidateId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agenda`
--

LOCK TABLES `agenda` WRITE;
/*!40000 ALTER TABLE `agenda` DISABLE KEYS */;
INSERT INTO `agenda` VALUES (16,37,35,'Test'),(68,45,103,'Expand the Canteen Menu'),(69,45,103,'Increase Car Parking');
/*!40000 ALTER TABLE `agenda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate`
--

DROP TABLE IF EXISTS `candidate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate` (
  `CandidateId` int NOT NULL AUTO_INCREMENT,
  `fName` varchar(128) NOT NULL,
  `lName` varchar(128) NOT NULL,
  `Email` varchar(250) NOT NULL,
  `ContactNo` varchar(100) DEFAULT NULL,
  `Twitter` varchar(100) DEFAULT NULL,
  `Instagram` varchar(100) DEFAULT NULL,
  `Facebook` varchar(100) DEFAULT NULL,
  `ElectionId` int NOT NULL,
  PRIMARY KEY (`CandidateId`),
  KEY `ElectionId` (`ElectionId`),
  CONSTRAINT `candidate_ibfk_1` FOREIGN KEY (`ElectionId`) REFERENCES `election` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate`
--

LOCK TABLES `candidate` WRITE;
/*!40000 ALTER TABLE `candidate` DISABLE KEYS */;
INSERT INTO `candidate` VALUES (36,'John','Maher','jmaher@gmail.com',NULL,NULL,NULL,NULL,1),(37,'Simon','Burke','simon.burke@setu.ie','12345','https://www.twitter.com/','https://www.instagram.com/','https://www.facebook.com/',1),(40,'Reopen','Election','NA',NULL,NULL,NULL,NULL,21),(41,'Reopen','Election','NA',NULL,NULL,NULL,NULL,21),(42,'Reopen','Election','NA',NULL,NULL,NULL,NULL,1),(43,'Reopen','Election','NA',NULL,NULL,NULL,NULL,1),(44,'Reopen','Election','NA',NULL,NULL,NULL,NULL,26),(45,'John','Burke','test@gmail.com','(086) 7319752','https://www.twitter.com/beckyetroy','https://www.instagram.com/beckyetroy','https://www.facebook.com/beckyetroy',26);
/*!40000 ALTER TABLE `candidate` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate_category`
--

DROP TABLE IF EXISTS `candidate_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_category` (
  `CandidateId` int NOT NULL,
  `CategoryId` int NOT NULL,
  `NumVotes` int NOT NULL DEFAULT '0',
  `Picture_type` varchar(50) DEFAULT NULL,
  `Slogan` varchar(250) DEFAULT NULL,
  `Overview` varchar(500) DEFAULT NULL,
  `Picture_path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`CandidateId`,`CategoryId`),
  KEY `CategoryId` (`CategoryId`),
  CONSTRAINT `candidate_category_ibfk_1` FOREIGN KEY (`CategoryId`) REFERENCES `category` (`CategoryId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `candidate_category_ibfk_2` FOREIGN KEY (`CandidateId`) REFERENCES `candidate` (`CandidateId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_category`
--

LOCK TABLES `candidate_category` WRITE;
/*!40000 ALTER TABLE `candidate_category` DISABLE KEYS */;
INSERT INTO `candidate_category` VALUES (36,36,2,NULL,NULL,NULL,NULL),(37,35,3,'image/jpeg','','Test Overview','\\uploads\\picture-1679516574164-tumblr_675b58b0db36cd26e22ff2e6c096c21d_8e158fa4_540.jpg'),(40,43,1,'image/jpeg',NULL,NULL,'/assets/Placeholder-icon2.jpg'),(41,44,1,'image/jpeg',NULL,NULL,'/assets/Placeholder-icon2.jpg'),(42,35,2,NULL,NULL,NULL,NULL),(43,36,2,NULL,NULL,NULL,NULL),(45,103,0,NULL,NULL,'I am a student ambassador and P2P mentor hoping to make a real difference to every day college life!','\\uploads\\image-1681171281612-2E562880-B8C9-4765-8A97-8472E834D855.jpeg');
/*!40000 ALTER TABLE `candidate_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate_credentials`
--

DROP TABLE IF EXISTS `candidate_credentials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_credentials` (
  `CandidateId` int NOT NULL,
  `Username` varchar(125) NOT NULL,
  `Password` varchar(250) NOT NULL,
  `Salt` varchar(500) DEFAULT NULL,
  `LoginAttempts` int DEFAULT '0',
  `BlockExpiration` datetime DEFAULT NULL,
  PRIMARY KEY (`CandidateId`),
  CONSTRAINT `candidate_credentials_ibfk_1` FOREIGN KEY (`CandidateId`) REFERENCES `candidate` (`CandidateId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_credentials`
--

LOCK TABLES `candidate_credentials` WRITE;
/*!40000 ALTER TABLE `candidate_credentials` DISABLE KEYS */;
INSERT INTO `candidate_credentials` VALUES (36,'JMaher','$argon2id$v=19$m=65536,t=3,p=4$xr1RnRTmvSqodNrKNW8VQw$8oJUJtP1VspU7gaUet5dU1WZTFd3DLygl323smi1dhc','vZr1xFzxcKidshuO',0,NULL),(37,'SBurke','$argon2id$v=19$m=65536,t=3,p=4$AR8stTA55LagUAoNu2ussQ$eBRKm2Fcslu93OrD/d3GkuJzMpQT/QvP/WWqmTjdVsE','9NME2anPfYOev9YY',0,NULL),(45,'TO\'Brien','$argon2id$v=19$m=65536,t=3,p=4$13n7HHdfB6axVStZMXIHrQ$OZU4JxT+oIuP3MrEx3uPclztbOqxRXQvJWKLnH1b1do','FXOmM1X4aVJisC6V',0,NULL);
/*!40000 ALTER TABLE `candidate_credentials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `candidate_media`
--

DROP TABLE IF EXISTS `candidate_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidate_media` (
  `file_id` int NOT NULL AUTO_INCREMENT,
  `CandidateId` int NOT NULL,
  `CategoryId` int NOT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `type` enum('image','video') DEFAULT NULL,
  PRIMARY KEY (`file_id`),
  KEY `CategoryId` (`CategoryId`),
  KEY `CandidateId` (`CandidateId`),
  CONSTRAINT `candidate_media_ibfk_1` FOREIGN KEY (`CategoryId`) REFERENCES `category` (`CategoryId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `candidate_media_ibfk_2` FOREIGN KEY (`CandidateId`) REFERENCES `candidate` (`CandidateId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `candidate_media`
--

LOCK TABLES `candidate_media` WRITE;
/*!40000 ALTER TABLE `candidate_media` DISABLE KEYS */;
INSERT INTO `candidate_media` VALUES (4,37,35,'\\uploads\\media-upload-1680712975332-video1284381408.mp4','video'),(5,37,35,'\\uploads\\media-upload-1680712987306-331549005_5826536054082352_964922432488347080_n.jpg','image'),(6,37,35,'\\uploads\\media-upload-1680738115797-332517478_924272835434798_5412823793662859849_n.jpg','image'),(7,37,35,'\\uploads\\media-upload-1680738115809-332536634_1140801749918917_7663568691582341085_n.jpg','image'),(8,37,35,'\\uploads\\media-upload-1680738115820-332538103_728457842231297_5945845090242852025_n.jpg','image'),(9,37,35,'\\uploads\\media-upload-1680738115831-332601271_2461616120670655_2526036318859527962_n.jpg','image'),(10,37,35,'\\uploads\\media-upload-1680738115843-332662740_509446504711488_8386402112594566345_n.jpg','image'),(11,37,35,'\\uploads\\media-upload-1680738115849-332794875_3141855859370112_1347559827447838928_n.jpg','image'),(12,37,35,'\\uploads\\media-upload-1680738115861-332937719_197920099582749_4665296492918163922_n.jpg','image'),(13,37,35,'\\uploads\\media-upload-1680738115875-333006046_1239395933655583_8291572227229816112_n.jpg','image'),(55,45,103,'https://localhost:3000/uploads/file-1681170958452-960x0.jpg','image'),(56,45,103,'https://localhost:3000/uploads/file-1681170958457-2019-01-18+23.49.10.jpg','image'),(57,45,103,'https://localhost:3000/uploads/file-1681170958515-40882hd.jpg','image');
/*!40000 ALTER TABLE `candidate_media` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `CategoryId` int NOT NULL AUTO_INCREMENT,
  `CategoryName` varchar(250) NOT NULL,
  `CategoryDescription` varchar(500) DEFAULT NULL,
  `ElectionId` int NOT NULL,
  PRIMARY KEY (`CategoryId`),
  KEY `ElectionId` (`ElectionId`),
  CONSTRAINT `category_ibfk_1` FOREIGN KEY (`ElectionId`) REFERENCES `election` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
INSERT INTO `category` VALUES (35,'President','The President is the chief executive officer and principal spokesperson for theStudents’ Union. He/she is responsible for administering the Union on a day to day basis and fornegotiating on its behalf with external organisations. The President represents the students onall of the major decision making bodies within WIT including the Governing Body and the Academic Council.',1),(36,'Education Officer','The Education Officer is responsible for Educational services on all campuses.They provide advice and referral services on issues such as Grinds, Grants, and is in charge of the ClassRep system.',1),(37,'Test','Test description',2),(42,'Test','Test',20),(43,'Test','Test',21),(44,'Test 2','Test',21),(103,'Test Again','Double check',26),(104,'Test 3','3rd time lucky',26),(105,'Test','Testing description',26);
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `election`
--

DROP TABLE IF EXISTS `election`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `election` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Description` varchar(250) NOT NULL,
  `ElectionDate` date NOT NULL,
  `OpenTime` datetime NOT NULL,
  `CloseTime` datetime NOT NULL,
  `Icon_path` varchar(255) DEFAULT NULL,
  `Icon_type` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `election`
--

LOCK TABLES `election` WRITE;
/*!40000 ALTER TABLE `election` DISABLE KEYS */;
INSERT INTO `election` VALUES (1,'2022-2023 SETUSU Annual Election','2023-04-07','2023-04-07 00:00:00','2023-04-07 17:00:00',NULL,NULL),(2,'2023-2024 SETUSU Annual Election','2023-03-31','2023-03-31 22:42:00','2023-03-31 22:42:00',NULL,NULL),(14,'Test Election','2023-07-28','2023-07-28 10:42:00','2023-07-28 22:42:00',NULL,NULL),(15,'Test Election 2','2023-03-29','2023-03-29 13:42:00','2023-03-29 22:42:00',NULL,NULL),(16,'Test Election 3','2023-03-31','2023-03-31 01:43:00','2023-03-31 16:43:00',NULL,NULL),(20,'2026-2027 SETUSU Annual Election Test','2023-03-28','2023-03-28 01:30:00','2023-03-28 15:30:00',NULL,NULL),(21,'2026-2028 SETUSU Annual Election Test','2023-03-30','2023-03-30 03:35:00','2023-03-30 16:35:00',NULL,NULL),(22,'Test','2023-04-11','2023-04-11 19:41:00','2023-04-11 22:41:00',NULL,NULL),(25,'Test Election With Icon','2023-04-12','2023-04-12 22:04:00','2023-04-12 23:52:00','\\uploads\\image-1681171660641-279704895_4775026865929806_9036612844711422585_n.jpg',NULL),(26,'Test Election With Categories','2023-04-10','2023-04-10 02:00:00','2023-04-10 10:00:00',NULL,NULL);
/*!40000 ALTER TABLE `election` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `voter`
--

DROP TABLE IF EXISTS `voter`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `voter` (
  `StudentNo` varchar(8) NOT NULL,
  `fName` varchar(128) NOT NULL,
  `lName` varchar(128) NOT NULL,
  `Email` varchar(250) NOT NULL,
  `Voted` tinyint(1) NOT NULL DEFAULT '0',
  `ElectionId` int NOT NULL,
  `CardImg` longblob,
  `CardImgMimeType` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`StudentNo`,`ElectionId`),
  KEY `ElectionId` (`ElectionId`),
  CONSTRAINT `voter_ibfk_1` FOREIGN KEY (`ElectionId`) REFERENCES `election` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `voter`
--

LOCK TABLES `voter` WRITE;
/*!40000 ALTER TABLE `voter` DISABLE KEYS */;
INSERT INTO `voter` VALUES ('20089091','Adam','O\'Brien','20089091@mail.wit.ie',0,1,NULL,NULL);
/*!40000 ALTER TABLE `voter` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-04-11 16:53:10