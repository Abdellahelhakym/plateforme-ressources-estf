-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Apr 06, 2026 at 02:12 PM
-- Server version: 9.1.0
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pfe`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

DROP TABLE IF EXISTS `admin`;
CREATE TABLE IF NOT EXISTS `admin` (
  `user` varchar(45) NOT NULL,
  `password` varchar(120) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`user`, `password`) VALUES
('admin', '$2b$10$PWTwE1IkJheIggyYlAMin.Kv8ZmCKvbtNcpl/xHAmpLMZiIzximle');

-- --------------------------------------------------------

--
-- Table structure for table `annee`
--

DROP TABLE IF EXISTS `annee`;
CREATE TABLE IF NOT EXISTS `annee` (
  `id_annee` int NOT NULL AUTO_INCREMENT,
  `libelle` varchar(9) NOT NULL,
  PRIMARY KEY (`id_annee`),
  UNIQUE KEY `libelle` (`libelle`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `annee`
--

INSERT INTO `annee` (`id_annee`, `libelle`) VALUES
(1, '2025/2026');

-- --------------------------------------------------------

--
-- Table structure for table `creneau`
--

DROP TABLE IF EXISTS `creneau`;
CREATE TABLE IF NOT EXISTS `creneau` (
  `id_creneau` int NOT NULL AUTO_INCREMENT,
  `heure_debut` time NOT NULL,
  `heure_fin` time NOT NULL,
  `duree` int NOT NULL,
  PRIMARY KEY (`id_creneau`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `creneau`
--

INSERT INTO `creneau` (`id_creneau`, `heure_debut`, `heure_fin`, `duree`) VALUES
(1, '08:30:00', '12:30:00', 4),
(2, '14:30:00', '18:30:00', 4);

-- --------------------------------------------------------

--
-- Table structure for table `filiere`
--

DROP TABLE IF EXISTS `filiere`;
CREATE TABLE IF NOT EXISTS `filiere` (
  `id_filiere` int NOT NULL AUTO_INCREMENT,
  `nom_filiere` varchar(100) NOT NULL,
  `annee` enum('1ere annee','2eme annee','3eme annee') DEFAULT NULL,
  `nb_group` int DEFAULT NULL,
  `niveau` varchar(20) NOT NULL,
  PRIMARY KEY (`id_filiere`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `filiere`
--

INSERT INTO `filiere` (`id_filiere`, `nom_filiere`, `annee`, `nb_group`, `niveau`) VALUES
(1, 'IL ', '2eme annee', 3, 'DUT'),
(2, 'IL ', '1ere annee', 4, 'DUT'),
(5, 'ID ', '1ere annee', 2, 'DUT'),
(6, 'ID', '2eme annee', 3, 'DUT'),
(7, 'GL', '', 3, 'Bachelor'),
(8, 'SDIA', '', 3, 'Bachelor'),
(9, 'CSIC', '', 3, 'Bachelor');

-- --------------------------------------------------------

--
-- Table structure for table `materiel`
--

DROP TABLE IF EXISTS `materiel`;
CREATE TABLE IF NOT EXISTS `materiel` (
  `id_materiel` int NOT NULL AUTO_INCREMENT,
  `nom_materiel` varchar(100) NOT NULL,
  `type_materiel` enum('Ordinateur','Projecteur','Imprimante / Scanner','Câbles & Accessoires','Mobilier','Outils / Maintenance','Équipement Audio / Vidéo','Équipements réseau','Logiciel / Licence','Autre') DEFAULT 'Autre',
  `etat` enum('Disponible','Occupee','En Maintenance') DEFAULT 'Disponible',
  `quantite` int DEFAULT '1',
  `salle` varchar(100) DEFAULT NULL,
  `Remarques` text,
  `img` varchar(255) DEFAULT NULL,
  `id_salle` int DEFAULT NULL,
  PRIMARY KEY (`id_materiel`),
  KEY `fk_materiel_salle` (`id_salle`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `materiel`
--

INSERT INTO `materiel` (`id_materiel`, `nom_materiel`, `type_materiel`, `etat`, `quantite`, `salle`, `Remarques`, `img`, `id_salle`) VALUES
(15, 'PC DELL', 'Ordinateur', 'Disponible', 12, 'F13', 'intel i7 11gen\r\nNvidia', '/img/materiel/img-15.JPG', 31),
(17, 'RJ45', 'Câbles & Accessoires', 'Disponible', 5, 'F13', '', '/img/materiel/img-17.JPG', 31),
(18, 'Fiber', 'Câbles & Accessoires', 'Disponible', 20, 'F13', '', '/img/materiel/img-18.JPG', 31),
(19, 'prises ', 'Équipements réseau', 'Disponible', 3, 'F13', '', '/img/materiel/img-19.JPG', 31),
(20, 'other1', 'Équipements réseau', 'Disponible', 8, 'F13', '', '/img/materiel/img-20.JPG', 31),
(21, 'colliers de serrage en nylon', 'Câbles & Accessoires', 'Disponible', 2, 'F13', '', '/img/materiel/img-21.JPG', 31),
(22, 'Connecteur RJ45', 'Câbles & Accessoires', 'Disponible', 2, 'F13', '', '/img/materiel/img-22.JPG', 31),
(23, 'other4', 'Équipements réseau', 'Disponible', 9, 'F13', '', '/img/materiel/img-23.JPG', 31),
(24, 'other5', 'Câbles & Accessoires', 'Disponible', 2, 'F13', '', '/img/materiel/img-24.JPG', 31),
(25, 'other6', 'Câbles & Accessoires', 'Disponible', 1, 'F13', '', '/img/materiel/img-25.JPG', 31),
(26, 'other7', 'Équipements réseau', 'Disponible', 24, 'F13', '', '/img/materiel/img-26.JPG', 31),
(27, 'other8', 'Équipements réseau', 'Disponible', 3, 'F13', '', '/img/materiel/img-27.JPG', 31),
(28, 'Battrie', 'Équipement Audio / Vidéo', 'Disponible', 14, 'F13', '', '/img/materiel/img-28.JPG', 31);

-- --------------------------------------------------------

--
-- Table structure for table `module_filiere`
--

DROP TABLE IF EXISTS `module_filiere`;
CREATE TABLE IF NOT EXISTS `module_filiere` (
  `id_module` int NOT NULL,
  `id_filiere` int NOT NULL,
  PRIMARY KEY (`id_module`,`id_filiere`),
  KEY `fk_module_filiere_fil` (`id_filiere`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `module_filiere`
--

INSERT INTO `module_filiere` (`id_module`, `id_filiere`) VALUES
(13, 1),
(14, 1),
(15, 1),
(25, 1),
(26, 1),
(27, 1),
(28, 1),
(29, 1),
(30, 1),
(31, 1),
(7, 2),
(8, 2),
(9, 2),
(10, 2),
(11, 2),
(12, 2),
(32, 2),
(33, 2),
(34, 2),
(10, 5),
(12, 5),
(16, 5),
(17, 5),
(18, 5),
(19, 5),
(20, 5),
(21, 6),
(22, 6),
(23, 6),
(24, 6);

-- --------------------------------------------------------

--
-- Table structure for table `module_tp`
--

DROP TABLE IF EXISTS `module_tp`;
CREATE TABLE IF NOT EXISTS `module_tp` (
  `id_module` int NOT NULL AUTO_INCREMENT,
  `nom_module` varchar(100) NOT NULL,
  `id_filiere` int NOT NULL,
  PRIMARY KEY (`id_module`),
  KEY `fk_module_filiere` (`id_filiere`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `module_tp`
--

INSERT INTO `module_tp` (`id_module`, `nom_module`, `id_filiere`) VALUES
(7, 'BDD R', 2),
(8, 'SDD C++', 2),
(9, 'Fondm.réseaux ', 2),
(10, 'Methodes Num', 5),
(11, 'Science de données et IA', 2),
(12, 'Dév Web', 5),
(13, 'Programmation BD', 1),
(14, 'Admin. Infra & Services', 1),
(15, 'Techn. Web avancées ', 1),
(16, 'POO Java', 5),
(17, 'Réseaux Inform. ', 5),
(18, 'Science de données et IA Laghrib ', 5),
(19, 'BDD T', 5),
(20, 'Cloud computing', 5),
(21, 'TALN', 6),
(22, 'Model. Workflows', 6),
(23, 'RPA', 6),
(24, 'ML avancé', 6),
(25, 'Dev Logiciel', 1),
(26, 'Com. & Routage', 1),
(27, 'Dév. mobile', 1),
(28, 'Gestion projet', 1),
(29, 'Normalisation', 1),
(30, 'Cybersécurité', 1),
(31, 'Program OOJ', 1),
(32, 'Archi. Ordi', 2),
(33, 'Syst. Exploit', 2),
(34, 'Algo & Program C', 2);

-- --------------------------------------------------------

--
-- Table structure for table `occupation`
--

DROP TABLE IF EXISTS `occupation`;
CREATE TABLE IF NOT EXISTS `occupation` (
  `id_occupation` int NOT NULL AUTO_INCREMENT,
  `id_annee` int NOT NULL,
  `id_semestre` int NOT NULL,
  `id_creneau` int NOT NULL,
  `jour` varchar(20) NOT NULL,
  `id_salles` int NOT NULL,
  `id_filier` int NOT NULL,
  `group` varchar(50) NOT NULL,
  `id_modul` int NOT NULL,
  `id_prof` int NOT NULL,
  `date_creation` datetime DEFAULT CURRENT_TIMESTAMP,
  `sD` int DEFAULT NULL,
  `sF` int DEFAULT NULL,
  PRIMARY KEY (`id_occupation`),
  KEY `fk_occupation_annee` (`id_annee`),
  KEY `fk_occupation_semestre` (`id_semestre`),
  KEY `fk_occupation_creneau` (`id_creneau`),
  KEY `fk_occupation_salle` (`id_salles`),
  KEY `fk_occupation_filiere` (`id_filier`),
  KEY `fk_occupation_module` (`id_modul`),
  KEY `fk_occupation_prof` (`id_prof`),
  KEY `fk_occupation_semaine_debut` (`sD`),
  KEY `fk_occupation_semaine_fin` (`sF`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `occupation`
--

INSERT INTO `occupation` (`id_occupation`, `id_annee`, `id_semestre`, `id_creneau`, `jour`, `id_salles`, `id_filier`, `group`, `id_modul`, `id_prof`, `date_creation`, `sD`, `sF`) VALUES
(19, 1, 3, 1, 'Lundi', 32, 1, '1', 25, 11, '2026-03-24 18:05:44', 53, 58),
(20, 1, 3, 1, 'Lundi', 31, 1, '1', 26, 14, '2026-03-24 18:05:44', 62, 64),
(21, 1, 3, 1, 'Mardi', 29, 1, '1', 28, 25, '2026-03-24 18:05:44', 57, 61),
(22, 1, 3, 1, 'Mardi', 32, 1, '2', 25, 11, '2026-03-24 18:05:44', 53, 58),
(23, 1, 3, 1, 'Mercredi', 31, 1, '1', 29, 14, '2026-03-24 18:05:44', 54, 58),
(24, 1, 3, 1, 'Mercredi', 31, 1, '2', 26, 14, '2026-03-24 18:05:44', 59, 63),
(25, 1, 3, 2, 'Jeudi', 32, 1, '2', 31, 7, '2026-03-24 18:05:44', 54, 59),
(26, 1, 3, 2, 'Jeudi', 31, 1, '2', 26, 14, '2026-03-24 18:05:44', 62, 64),
(27, 1, 3, 1, 'Vendredi', 32, 1, '3', 25, 11, '2026-03-24 18:05:44', 53, 58),
(28, 1, 3, 1, 'Vendredi', 31, 1, '2', 30, 27, '2026-03-24 18:05:44', 61, 65),
(29, 1, 3, 1, 'Lundi', 30, 1, '2', 27, 26, '2026-03-24 18:13:34', 58, 64),
(30, 1, 3, 1, 'Mardi', 31, 1, '3', 29, 14, '2026-03-24 18:13:34', 54, 58),
(31, 1, 3, 1, 'Mardi', 31, 1, '3', 26, 14, '2026-03-24 18:13:34', 59, 63),
(32, 1, 3, 1, 'Mercredi', 30, 1, '3', 27, 26, '2026-03-24 18:13:34', 58, 64),
(33, 1, 3, 1, 'Mercredi', 29, 1, '1', 30, 27, '2026-03-24 18:13:34', 57, 61),
(34, 1, 3, 2, 'Jeudi', 29, 1, '3', 28, 25, '2026-03-24 18:13:34', 57, 61),
(35, 1, 3, 2, 'Jeudi', 30, 1, '1', 27, 26, '2026-03-24 18:13:34', 58, 64),
(36, 1, 3, 1, 'Vendredi', 30, 1, '3', 26, 14, '2026-03-24 18:13:34', 62, 64),
(37, 1, 3, 1, 'Vendredi', 31, 1, '1', 31, 7, '2026-03-24 18:13:34', 54, 59),
(38, 1, 3, 2, 'Mardi', 31, 1, '3', 30, 27, '2026-03-24 18:15:25', 61, 65),
(39, 1, 3, 2, 'Mardi', 30, 1, '2', 28, 25, '2026-03-24 18:15:25', 57, 61),
(40, 1, 3, 2, 'Mercredi', 32, 1, '3', 31, 7, '2026-03-24 18:15:25', 54, 59),
(41, 1, 3, 2, 'Mardi', 31, 1, '1', 29, 14, '2026-03-24 18:17:38', 54, 58),
(42, 1, 3, 2, 'Mardi', 29, 1, '1', 26, 14, '2026-03-24 18:17:38', 59, 63),
(44, 1, 1, 2, 'Lundi', 32, 2, '2', 32, 16, '2026-04-04 17:52:07', 23, 26),
(45, 1, 1, 2, 'Lundi', 30, 2, '1', 33, 13, '2026-04-04 17:52:07', 23, 28),
(46, 1, 1, 2, 'Mercredi', 31, 2, '1', 32, 16, '2026-04-04 17:52:07', 23, 26),
(47, 1, 1, 2, 'Mercredi', 30, 2, '3', 33, 18, '2026-04-04 17:52:07', 23, 28),
(48, 1, 1, 1, 'Jeudi', 32, 2, '3', 32, 16, '2026-04-04 17:52:07', 23, 26),
(49, 1, 1, 1, 'Jeudi', 29, 2, '2', 34, 9, '2026-04-04 17:52:07', 23, 29),
(50, 1, 1, 1, 'Vendredi', 30, 2, '4', 32, 16, '2026-04-04 17:52:07', 23, 26),
(51, 1, 1, 1, 'Vendredi', 29, 2, '1', 34, 9, '2026-04-04 17:52:07', 23, 29),
(52, 1, 1, 2, 'Lundi', 29, 2, '3', 34, 9, '2026-04-04 17:55:21', 23, 29),
(53, 1, 1, 2, 'Lundi', 31, 2, '4', 33, 18, '2026-04-04 17:55:21', 23, 28),
(54, 1, 1, 2, 'Mercredi', 29, 2, '4', 34, 9, '2026-04-04 17:55:21', 23, 29),
(55, 1, 1, 1, 'Vendredi', 33, 2, '2', 33, 13, '2026-04-04 17:55:21', 23, 28);

-- --------------------------------------------------------

--
-- Table structure for table `occupation_semain`
--

DROP TABLE IF EXISTS `occupation_semain`;
CREATE TABLE IF NOT EXISTS `occupation_semain` (
  `id_occupation_semain` int NOT NULL AUTO_INCREMENT,
  `id_occupation` int NOT NULL,
  `id_semain` int NOT NULL,
  PRIMARY KEY (`id_occupation_semain`),
  KEY `fk_occ_semain_occ` (`id_occupation`),
  KEY `fk_occ_semain_semaine` (`id_semain`)
) ENGINE=InnoDB AUTO_INCREMENT=283 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `occupation_semain`
--

INSERT INTO `occupation_semain` (`id_occupation_semain`, `id_occupation`, `id_semain`) VALUES
(84, 19, 53),
(85, 19, 54),
(86, 19, 55),
(87, 19, 56),
(88, 19, 57),
(89, 19, 58),
(90, 20, 62),
(91, 20, 63),
(92, 20, 64),
(93, 21, 57),
(94, 21, 58),
(95, 21, 59),
(96, 21, 60),
(97, 21, 61),
(98, 22, 53),
(99, 22, 54),
(100, 22, 55),
(101, 22, 56),
(102, 22, 57),
(103, 22, 58),
(104, 23, 54),
(105, 23, 55),
(106, 23, 56),
(107, 23, 57),
(108, 23, 58),
(109, 24, 59),
(110, 24, 60),
(111, 24, 61),
(112, 24, 62),
(113, 24, 63),
(114, 25, 54),
(115, 25, 55),
(116, 25, 56),
(117, 25, 57),
(118, 25, 58),
(119, 25, 59),
(120, 26, 62),
(121, 26, 63),
(122, 26, 64),
(123, 27, 53),
(124, 27, 54),
(125, 27, 55),
(126, 27, 56),
(127, 27, 57),
(128, 27, 58),
(129, 28, 61),
(130, 28, 62),
(131, 28, 63),
(132, 28, 64),
(133, 28, 65),
(134, 29, 58),
(135, 29, 59),
(136, 29, 60),
(137, 29, 61),
(138, 29, 62),
(139, 29, 63),
(140, 29, 64),
(141, 30, 54),
(142, 30, 55),
(143, 30, 56),
(144, 30, 57),
(145, 30, 58),
(146, 31, 59),
(147, 31, 60),
(148, 31, 61),
(149, 31, 62),
(150, 31, 63),
(151, 32, 58),
(152, 32, 59),
(153, 32, 60),
(154, 32, 61),
(155, 32, 62),
(156, 32, 63),
(157, 32, 64),
(158, 33, 57),
(159, 33, 58),
(160, 33, 59),
(161, 33, 60),
(162, 33, 61),
(163, 34, 57),
(164, 34, 58),
(165, 34, 59),
(166, 34, 60),
(167, 34, 61),
(168, 35, 58),
(169, 35, 59),
(170, 35, 60),
(171, 35, 61),
(172, 35, 62),
(173, 35, 63),
(174, 35, 64),
(175, 36, 62),
(176, 36, 63),
(177, 36, 64),
(178, 37, 54),
(179, 37, 55),
(180, 37, 56),
(181, 37, 57),
(182, 37, 58),
(183, 37, 59),
(184, 38, 61),
(185, 38, 62),
(186, 38, 63),
(187, 38, 64),
(188, 38, 65),
(189, 39, 57),
(190, 39, 58),
(191, 39, 59),
(192, 39, 60),
(193, 39, 61),
(194, 40, 54),
(195, 40, 55),
(196, 40, 56),
(197, 40, 57),
(198, 40, 58),
(199, 40, 59),
(200, 41, 54),
(201, 41, 55),
(202, 41, 56),
(203, 41, 57),
(204, 41, 58),
(205, 42, 59),
(206, 42, 60),
(207, 42, 61),
(208, 42, 62),
(209, 42, 63),
(215, 44, 23),
(216, 44, 24),
(217, 44, 25),
(218, 44, 26),
(219, 45, 23),
(220, 45, 24),
(221, 45, 25),
(222, 45, 26),
(223, 45, 27),
(224, 45, 28),
(225, 46, 23),
(226, 46, 24),
(227, 46, 25),
(228, 46, 26),
(229, 47, 23),
(230, 47, 24),
(231, 47, 25),
(232, 47, 26),
(233, 47, 27),
(234, 47, 28),
(235, 48, 23),
(236, 48, 24),
(237, 48, 25),
(238, 48, 26),
(239, 49, 23),
(240, 49, 24),
(241, 49, 25),
(242, 49, 26),
(243, 49, 27),
(244, 49, 28),
(245, 49, 29),
(246, 50, 23),
(247, 50, 24),
(248, 50, 25),
(249, 50, 26),
(250, 51, 23),
(251, 51, 24),
(252, 51, 25),
(253, 51, 26),
(254, 51, 27),
(255, 51, 28),
(256, 51, 29),
(257, 52, 23),
(258, 52, 24),
(259, 52, 25),
(260, 52, 26),
(261, 52, 27),
(262, 52, 28),
(263, 52, 29),
(264, 53, 23),
(265, 53, 24),
(266, 53, 25),
(267, 53, 26),
(268, 53, 27),
(269, 53, 28),
(270, 54, 23),
(271, 54, 24),
(272, 54, 25),
(273, 54, 26),
(274, 54, 27),
(275, 54, 28),
(276, 54, 29),
(277, 55, 23),
(278, 55, 24),
(279, 55, 25),
(280, 55, 26),
(281, 55, 27),
(282, 55, 28);

-- --------------------------------------------------------

--
-- Table structure for table `professeur`
--

DROP TABLE IF EXISTS `professeur`;
CREATE TABLE IF NOT EXISTS `professeur` (
  `id_prof` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `departement` varchar(150) DEFAULT NULL,
  `id_filiere` int DEFAULT NULL,
  PRIMARY KEY (`id_prof`),
  KEY `fk_professeur_filiere` (`id_filiere`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `professeur`
--

INSERT INTO `professeur` (`id_prof`, `nom`, `prenom`, `email`, `password`, `departement`, `id_filiere`) VALUES
(5, 'BACHIRI', 'younesaziz', 'younesaziz.bachiri@usmba.ac.ma', '$2b$10$o5s16auzDhnZ6VdL7tEFxuxSOKelW0Tm/S/ljsQ2fT/gjQw9deREC', 'Génie Informatique', 6),
(6, 'BENNIS', 'lamyae', 'lamyae.bennis@usmba.ac.ma', '$2b$10$7G.5K.uMOTNKqEFLSx4ZPO2NkF.qVYWuEgObMEN95dmGzM8MHRpba', 'Génie Informatique', 5),
(7, 'BENSLIMANE', 'mohamed', 'mohamed.benslimane@usmba.ac.ma', '$2b$10$o/m318VgBDlIQ3ZviEj45eD/0b./4ssj5I/PdscuXtyenXrRCVV6q', 'Génie Informatique', 1),
(8, 'BOUKIL', 'naoual', 'naoual.boukil@usmba.ac.ma', '$2b$10$1ePCDYYCvfQ2javmpcobduXnrqcaG518PkTmk4.evgyYqFTfPxluG', 'Génie Informatique', NULL),
(9, 'EL KANT', 'noureddine', 'noureddine.elkant@usmba.ac.ma', '$2b$10$Z37nANPtuKBfilNQbKqk7erWL3Wav9dhkE6/7UacgHEDYA4ULFdqy', 'Génie Informatique', 2),
(10, 'GMIRA', 'faiq', 'faiq.gmira@usmba.ac.ma', '$2b$10$94y7Kby/lfVgXJl./PRXluB0z.YkKMz9rDPghkTaSisu0RGPbIYES', 'Génie Informatique', 2),
(11, 'HACHMOUD', 'adil', 'adil.hachmoud@usmba.ac.ma', '$2b$10$jatL2F8ZF4jPDGMV5/H0ee34YvQq6ygzgm6I8LtDw3Ecepfv.WiJW', 'Génie Informatique', 6),
(12, 'HDIOUD', 'ferdaous', 'ferdaous.hdioud@usmba.ac.ma', '$2b$10$/iDH7QeDCnQIrsRGNQh8JOfs0888VVU.vNw2lyvFBtHoBTz/dW3vm', 'Génie Informatique', NULL),
(13, 'IBRIZ', 'abdelali', 'abdelali.ibriz@usmba.ac.ma', '$2b$10$fSOUd96TnjvjvY0FuZRmb.M6E0nW1a8h.3ulUxxlW3tLKidprY8pS', 'Génie Informatique', 2),
(14, 'KHARTOCH', 'abdelkrim', 'abdelkrim.khartoch@usmba.ac.ma', '$2b$10$lhZc4fpUq7Z1AbpVzub1yuM9j4dSMQexk/qDH1XmH68ZHea3S7e6q', 'Génie Informatique', 1),
(15, 'NFISSI', 'najib', 'najib.nfissi@usmba.ac.ma', '$2b$10$T5qIjfJ9zaI/6GVxB0Ac9OOXFXCB1/sSUVmlnRk1wpa/HBF9Tn3su', 'Génie Informatique', 2),
(16, 'OMOR', 'amine', 'amine.omor@usmba.ac.ma', '$2b$10$1Xff2/3Dv375AKB77xF/0uKy6zOEZAJnTm.5fAKDfs3jgaV6wyx3e', 'Génie Informatique', 6),
(17, 'TMIMI', 'mehdi', 'mehdi.tmimi@usmba.ac.ma', '$2b$10$VLaGjScb6Ajrk2I92Qq7NOev/R5B1wXig2cGccgTZnuCnBGnj5QiW', 'Génie Informatique', 1),
(18, 'ZOIZOU', 'abdelhay', 'abdelhay.zoizou@usmba.ac.ma', '$2b$10$x2BFBKBAepht3aTzd1fip.EW.FWGAdUHAAFTNToBKpeiCQQ7RBkHS', 'Génie Informatique', 1),
(19, 'ZOUITEN', 'mohammed', 'mohammed.zouiten@usmba.ac.ma', '$2b$10$LFEWOBwx6CqZ.WUe7WrpDemWTVC1/ECLOvnJhk/Zo4cUPD5uEx5Qe', 'Génie Informatique', 1),
(20, 'BOUSSETTA', 'mohammed', 'mohammed.boussetta@usmba.ac.ma', '$2b$10$zAnm10FP0uEWVJaDkaxtWe/jY4GdL4CzPgwXPyAcCdYW3eil4k43C', 'Génie Informatique', NULL),
(22, 'EL-MEKKAOUI', 'jaouad', 'jaouad.elemekkaoui@usmba.ac.ma', '$2b$10$QWSTx6yxQ96IOyC.qXCRXOx0R1brvp3rvzDPtnT35mQnifQP5TUF6', 'Génie Informatique', NULL),
(23, 'NEJJAR', 'badr', 'badr.nejjar@usmba.ac.ma', '$2b$10$G2qbo9tNhTS75emTflhv0eBpE0PBZLySUmC6XlO.ihQ5wJ5D/8t2u', 'Génie Informatique', 2),
(24, 'QESMI', 'redouane', 'redouane.qesmi@usmba.ac.ma', '$2b$10$KCLGc1HEJJ.AAB2pmJf2hu/45w8ddwy6OtR5vVSdQ15xc34XK6Ir6', 'Génie Informatique', NULL),
(25, 'Hamdouch', 'houssam ', 'hamdouchhoussam@gmail.com', '$2b$10$A900Ml39L2lkzmt7UBlRrO411eb2wgNr8p/Q3g1EuUf2b9R6pcQwO', 'Génie Informatique', 1),
(26, 'Chahdi', 'Chahdi', 'Chahdi.Chahdi@usmba.ac.ma', '$2b$10$8Rb3Dxm9mH12o/oBBsKBPOU8NLMf47mnk/.u.jljjO0K38iZIqFE6', 'Génie Informatique', 1),
(27, 'Janati', 'mohammed', 'Mohammed.janati@usmba.ac.ma', '$2b$10$7Sm2xAtkHXbyYjWeVcpKFOYpy077KnKLYJa8KsRQy5Oq6OX/AoCXa', 'Génie Informatique', 1),
(28, 'El hakym', 'Abdellah', 'abdellahelhakym00@gmail.com', '$2b$10$6WS9DAhlyVLvBjyt.MxZvewJ07rOpDMjaoTXfO1uARmra/7/hm5.W', 'Génie Informatique', 1);

-- --------------------------------------------------------

--
-- Table structure for table `professeur_filiere`
--

DROP TABLE IF EXISTS `professeur_filiere`;
CREATE TABLE IF NOT EXISTS `professeur_filiere` (
  `id_prof` int NOT NULL,
  `id_filiere` int NOT NULL,
  PRIMARY KEY (`id_prof`,`id_filiere`),
  KEY `fk_professeur_filiere_fil` (`id_filiere`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `professeur_filiere`
--

INSERT INTO `professeur_filiere` (`id_prof`, `id_filiere`) VALUES
(7, 1),
(11, 1),
(14, 1),
(17, 1),
(18, 1),
(19, 1),
(25, 1),
(26, 1),
(27, 1),
(28, 1),
(9, 2),
(10, 2),
(11, 2),
(13, 2),
(14, 2),
(15, 2),
(16, 2),
(17, 2),
(18, 2),
(23, 2),
(6, 5),
(5, 6),
(11, 6),
(16, 6);

-- --------------------------------------------------------

--
-- Table structure for table `salles`
--

DROP TABLE IF EXISTS `salles`;
CREATE TABLE IF NOT EXISTS `salles` (
  `id_salle` int NOT NULL AUTO_INCREMENT,
  `nom_salle` varchar(50) NOT NULL,
  `type_salle` varchar(20) DEFAULT NULL,
  `capacite` int DEFAULT NULL,
  `etat` varchar(20) DEFAULT 'Disponible',
  `Remarques` varchar(300) DEFAULT NULL,
  `batiment` varchar(50) DEFAULT NULL,
  `img` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_salle`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `salles`
--

INSERT INTO `salles` (`id_salle`, `nom_salle`, `type_salle`, `capacite`, `etat`, `Remarques`, `batiment`, `img`) VALUES
(29, 'F11', 'TP', 20, 'Disponible', '', 'F', '/img/salles/img-1-29.jpg'),
(30, 'F12', 'TP', 20, 'Disponible', '', 'F', '/img/salles/img-1-30.jpg'),
(31, 'F13', 'Reseaux', 20, 'Disponible', '', 'F', '/img/salles/img-1-31.JPG'),
(32, 'F14', 'TP', 20, 'Disponible', '', 'F', '/img/salles/img-1-32.JPG'),
(33, 'S33', 'TP', 20, 'Disponible', '', 'S', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `semaine`
--

DROP TABLE IF EXISTS `semaine`;
CREATE TABLE IF NOT EXISTS `semaine` (
  `id_semaine` int NOT NULL AUTO_INCREMENT,
  `nom_semaine` varchar(3) DEFAULT NULL,
  `date_debut` date NOT NULL,
  `date_fin` date NOT NULL,
  `id_semestre` int DEFAULT NULL,
  PRIMARY KEY (`id_semaine`),
  KEY `fk_semaine_semestre` (`id_semestre`)
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `semaine`
--

INSERT INTO `semaine` (`id_semaine`, `nom_semaine`, `date_debut`, `date_fin`, `id_semestre`) VALUES
(16, 'S0', '2000-09-15', '2000-09-20', 1),
(17, 'S1', '2000-09-22', '2000-09-27', 1),
(18, 'S2', '2000-09-29', '2000-10-04', 1),
(19, 'S3', '2000-10-06', '2000-10-11', 1),
(20, 'S4', '2000-10-13', '2000-10-18', 1),
(21, 'S5', '2000-10-20', '2000-10-25', 1),
(22, 'S6', '2000-10-27', '2000-11-01', 1),
(23, 'S7', '2000-11-03', '2000-11-08', 1),
(24, 'S8', '2000-11-10', '2000-11-15', 1),
(25, 'S9', '2000-11-17', '2000-11-22', 1),
(26, 'S10', '2000-11-24', '2000-11-29', 1),
(27, 'S11', '2000-12-01', '2000-12-06', 1),
(28, 'S12', '2000-12-08', '2000-12-13', 1),
(29, 'S13', '2000-12-15', '2000-12-20', 1),
(30, 'S14', '2000-12-22', '2000-12-27', 1),
(31, 'S15', '2000-12-29', '2001-01-03', 1),
(32, 'S16', '2001-01-05', '2001-01-10', 1),
(33, 'S17', '2001-02-02', '2001-02-07', 2),
(34, 'S18', '2001-02-09', '2001-02-14', 2),
(35, 'S19', '2001-02-16', '2001-02-21', 2),
(36, 'S20', '2001-02-23', '2001-02-28', 2),
(37, 'S21', '2001-03-02', '2001-03-07', 2),
(38, 'S22', '2001-03-09', '2001-03-14', 2),
(39, 'S23', '2001-03-16', '2001-03-21', 2),
(40, 'S24', '2001-03-23', '2001-03-28', 2),
(41, 'S25', '2001-03-30', '2001-04-04', 2),
(42, 'S26', '2001-04-06', '2001-04-11', 2),
(43, 'S27', '2001-04-13', '2001-04-18', 2),
(44, 'S28', '2001-04-20', '2001-04-25', 2),
(45, 'S29', '2001-04-27', '2001-04-30', 2),
(46, 'S30', '2001-05-11', '2001-05-16', 2),
(47, 'S31', '2001-05-18', '2001-05-23', 2),
(48, 'S32', '2001-05-25', '2001-05-30', 2),
(49, 'S0', '2000-09-08', '2000-09-13', 3),
(50, 'S1', '2000-09-15', '2000-09-20', 3),
(51, 'S2', '2000-09-22', '2000-09-27', 3),
(52, 'S3', '2000-09-29', '2000-10-04', 3),
(53, 'S4', '2000-10-06', '2000-10-11', 3),
(54, 'S5', '2000-10-13', '2000-10-18', 3),
(55, 'S6', '2000-10-20', '2000-10-25', 3),
(56, 'S7', '2000-10-27', '2000-11-01', 3),
(57, 'S8', '2000-11-03', '2000-11-08', 3),
(58, 'S9', '2000-11-10', '2000-11-15', 3),
(59, 'S10', '2000-11-17', '2000-11-22', 3),
(60, 'S11', '2000-11-24', '2000-11-29', 3),
(61, 'S12', '2000-12-01', '2000-12-06', 3),
(62, 'S13', '2000-12-08', '2000-12-13', 3),
(63, 'S14', '2000-12-15', '2000-12-20', 3),
(64, 'S15', '2000-12-22', '2000-12-27', 3),
(65, 'S16', '2000-12-29', '2001-01-03', 3),
(66, 'S17', '2001-02-02', '2001-02-07', 4),
(67, 'S18', '2001-02-09', '2001-02-14', 4),
(68, 'S19', '2001-02-16', '2001-02-21', 4),
(69, 'S20', '2001-02-23', '2001-02-28', 4),
(70, 'S21', '2001-03-02', '2001-03-07', 4),
(71, 'S22', '2001-03-09', '2001-03-14', 4),
(72, 'S23', '2001-03-16', '2001-03-21', 4),
(73, 'S24', '2001-03-23', '2001-03-28', 4);

-- --------------------------------------------------------

--
-- Table structure for table `semestre`
--

DROP TABLE IF EXISTS `semestre`;
CREATE TABLE IF NOT EXISTS `semestre` (
  `id_semestre` int NOT NULL AUTO_INCREMENT,
  `nom_semestre` varchar(10) NOT NULL,
  `type_partit` varchar(20) NOT NULL DEFAULT 'partit 1',
  PRIMARY KEY (`id_semestre`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `semestre`
--

INSERT INTO `semestre` (`id_semestre`, `nom_semestre`, `type_partit`) VALUES
(1, 'S1', 'partit 1'),
(2, 'S2', 'partit 2'),
(3, 'S3', 'partit 1'),
(4, 'S4', 'partit 2'),
(5, 'S5', 'partit 1'),
(6, 'S6', 'partit 2');

--
-- Constraints for dumped tables
--

--
-- Constraints for table `materiel`
--
ALTER TABLE `materiel`
  ADD CONSTRAINT `fk_materiel_salle` FOREIGN KEY (`id_salle`) REFERENCES `salles` (`id_salle`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `module_filiere`
--
ALTER TABLE `module_filiere`
  ADD CONSTRAINT `fk_module_filiere_fil` FOREIGN KEY (`id_filiere`) REFERENCES `filiere` (`id_filiere`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_module_filiere_module` FOREIGN KEY (`id_module`) REFERENCES `module_tp` (`id_module`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `module_tp`
--
ALTER TABLE `module_tp`
  ADD CONSTRAINT `fk_module_filiere` FOREIGN KEY (`id_filiere`) REFERENCES `filiere` (`id_filiere`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `occupation`
--
ALTER TABLE `occupation`
  ADD CONSTRAINT `fk_occupation_annee` FOREIGN KEY (`id_annee`) REFERENCES `annee` (`id_annee`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_occupation_creneau` FOREIGN KEY (`id_creneau`) REFERENCES `creneau` (`id_creneau`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_occupation_filiere` FOREIGN KEY (`id_filier`) REFERENCES `filiere` (`id_filiere`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_occupation_module` FOREIGN KEY (`id_modul`) REFERENCES `module_tp` (`id_module`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_occupation_prof` FOREIGN KEY (`id_prof`) REFERENCES `professeur` (`id_prof`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_occupation_salle` FOREIGN KEY (`id_salles`) REFERENCES `salles` (`id_salle`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_occupation_semaine_debut` FOREIGN KEY (`sD`) REFERENCES `semaine` (`id_semaine`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_occupation_semaine_fin` FOREIGN KEY (`sF`) REFERENCES `semaine` (`id_semaine`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_occupation_semestre` FOREIGN KEY (`id_semestre`) REFERENCES `semestre` (`id_semestre`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `occupation_semain`
--
ALTER TABLE `occupation_semain`
  ADD CONSTRAINT `fk_occ_semain_occ` FOREIGN KEY (`id_occupation`) REFERENCES `occupation` (`id_occupation`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_occ_semain_semaine` FOREIGN KEY (`id_semain`) REFERENCES `semaine` (`id_semaine`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `professeur`
--
ALTER TABLE `professeur`
  ADD CONSTRAINT `fk_professeur_filiere` FOREIGN KEY (`id_filiere`) REFERENCES `filiere` (`id_filiere`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `professeur_filiere`
--
ALTER TABLE `professeur_filiere`
  ADD CONSTRAINT `fk_professeur_filiere_fil` FOREIGN KEY (`id_filiere`) REFERENCES `filiere` (`id_filiere`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_professeur_filiere_prof` FOREIGN KEY (`id_prof`) REFERENCES `professeur` (`id_prof`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `semaine`
--
ALTER TABLE `semaine`
  ADD CONSTRAINT `fk_semaine_semestre` FOREIGN KEY (`id_semestre`) REFERENCES `semestre` (`id_semestre`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
