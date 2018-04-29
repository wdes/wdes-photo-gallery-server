
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `wdesphotogallery` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `wdesphotogallery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Api__Scopes` (
  `name` varchar(50) NOT NULL COMMENT 'Nom du scope',
  `description` varchar(255) NOT NULL COMMENT 'Description du scope',
  PRIMARY KEY (`name`),
  UNIQUE KEY `name_2` (`name`),
  KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Api__TokenAlias` (
  `token` varchar(32) NOT NULL COMMENT 'Token',
  `alias` varchar(50) NOT NULL COMMENT 'Alias du groupe de scopes',
  PRIMARY KEY (`token`,`alias`),
  KEY `alias` (`alias`),
  KEY `token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Api__TokenExpirations` (
  `token` varchar(32) NOT NULL COMMENT 'Token',
  `created` timestamp NULL DEFAULT current_timestamp() COMMENT 'Timestamp de la création',
  `expires` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' COMMENT 'Expiration du token',
  PRIMARY KEY (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Api__TokenScopes` (
  `name` varchar(50) NOT NULL COMMENT 'Nom du scope',
  `groupName` varchar(50) NOT NULL COMMENT 'Nom du groupe de scopes',
  `created` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Timestamp de création',
  PRIMARY KEY (`name`,`groupName`),
  KEY `API_INDEX_HAS_PERMISSION` (`name`,`groupName`) USING BTREE,
  KEY `groupName` (`groupName`),
  CONSTRAINT `ApiToken_name` FOREIGN KEY (`name`) REFERENCES `Api__Scopes` (`name`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Liste des permissions par token';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Sessions` (
  `idUser` int(11) unsigned NOT NULL COMMENT 'User id',
  `idSession` varchar(32) NOT NULL COMMENT 'Session id',
  `token` varchar(32) NOT NULL COMMENT 'Token',
  `expires` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Expiration timestamp',
  `ip` varchar(45) NOT NULL COMMENT 'Login IP',
  `tag` varchar(500) NOT NULL COMMENT 'Session tag',
  PRIMARY KEY (`idUser`,`idSession`),
  UNIQUE KEY `token` (`token`),
  KEY `expires` (`expires`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Users sessions';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

