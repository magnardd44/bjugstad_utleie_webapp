SELECT current_user,
    current_database();
SELECT *
FROM healthcheck_events
ORDER BY id DESC
LIMIT 5;