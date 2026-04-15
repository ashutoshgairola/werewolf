-- Werewolf game database schema
-- Auto-run by Postgres on first container start (docker-entrypoint-initdb.d)

CREATE TABLE IF NOT EXISTS game_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code        TEXT        NOT NULL,
    started_at       TIMESTAMPTZ NOT NULL,
    ended_at         TIMESTAMPTZ NOT NULL,
    duration_seconds INTEGER     NOT NULL,
    winner           TEXT        NOT NULL CHECK (winner IN ('wolves', 'villagers')),
    total_rounds     INTEGER     NOT NULL,
    player_count     INTEGER     NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_players (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id          UUID        NOT NULL REFERENCES game_logs(id) ON DELETE CASCADE,
    player_id        TEXT        NOT NULL,
    display_name     TEXT        NOT NULL,
    role             TEXT        NOT NULL CHECK (role IN ('werewolf', 'villager', 'seer', 'doctor')),
    outcome          TEXT        NOT NULL CHECK (outcome IN ('survived', 'killed_night', 'lynched')),
    eliminated_round INTEGER
);

CREATE TABLE IF NOT EXISTS game_chat_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id     UUID        NOT NULL REFERENCES game_logs(id) ON DELETE CASCADE,
    channel     TEXT        NOT NULL CHECK (channel IN ('day', 'ghost', 'system')),
    sender_id   TEXT        NOT NULL,
    sender_name TEXT        NOT NULL,
    text        TEXT        NOT NULL,
    sent_at     TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_players_game_id    ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_chat_logs_game_id  ON game_chat_logs(game_id);
CREATE INDEX IF NOT EXISTS idx_game_logs_room_code     ON game_logs(room_code);
