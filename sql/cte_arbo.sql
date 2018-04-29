-- Source : https://dev.mysql.com/doc/refman/8.0/en/with.html#common-table-expressions-recursive-hierarchy-traversal
-- "To produce the organizational chart with the management chain for each employee [...], use a recursive CTE:"
--
-- Path of object starting at root
WITH RECURSIVE arbo (idContainer, name, path) AS
(
  SELECT idContainer, getContainerName(idContainer) as name, CAST(CONCAT('/',getContainerName(idContainer)) AS CHAR(1000))
    FROM gfs__Structure
    WHERE idContainerParent IS NULL
  UNION ALL
  SELECT e.idContainer, getContainerName(e.idContainer) as name, CONCAT(ep.path, '/', getContainerName(e.idContainer))
    FROM arbo AS ep JOIN gfs__Structure AS e
      ON ep.idContainer = e.idContainerParent
)
SELECT * FROM arbo ORDER BY path;

-- Path of object starting at root (clean)
WITH RECURSIVE arbo (idContainer, path) AS
(
  SELECT idContainer, CAST(CONCAT('/',getContainerName(idContainer)) AS CHAR(1000))
    FROM gfs__Structure
    WHERE idContainerParent IS NULL
  UNION ALL
  SELECT e.idContainer, CONCAT(ep.path, '/', getContainerName(e.idContainer))
    FROM arbo AS ep JOIN gfs__Structure AS e
      ON ep.idContainer = e.idContainerParent
)
SELECT * FROM arbo ORDER BY path;

-- Path of root
WITH RECURSIVE arbo (idContainer, path) AS
(
  SELECT idContainer, CAST(CONCAT('/',getContainerName(idContainer)) AS CHAR(1000))
    FROM gfs__Structure
    WHERE idContainerParent IS NULL
  UNION ALL
  SELECT e.idContainer, CONCAT(ep.path, '/', getContainerName(e.idContainer))
    FROM arbo AS ep JOIN gfs__Structure AS e
      ON ep.idContainer = e.idContainerParent
)
SELECT idContainer, deleteTrailingSlash(getRoot(path)) FROM arbo ORDER BY path



WITH RECURSIVE arbo (idContainer, path) AS
(
    SELECT s.idContainer, CAST(CONCAT('/',getContainerName(s.idContainer)) AS CHAR(1000))
    FROM gfs__Structure s
    WHERE s.idContainerParent IS NULL
    UNION ALL
    SELECT e.idContainer, CONCAT(ep.path, '/', getContainerName(e.idContainer))
    FROM arbo AS ep JOIN gfs__Structure AS e
    ON ep.idContainer = e.idContainerParent
)

SELECT deleteTrailingSlash(getRoot(arbo.path)) FROM arbo;
