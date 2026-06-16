-- Sample seed data for development/demo
-- Run after the schema migration

-- State daily profiles with sample words
INSERT INTO state_daily_profile (state, date, top_word, dominant_sentiment, sentiment_avg, sentiment_std, post_volume, category)
VALUES
  ('AL', CURRENT_DATE, 'football', 'positive', 0.15, 0.32, 145, 'cultural'),
  ('AK', CURRENT_DATE, 'wilderness', 'positive', 0.22, 0.28, 42, 'identity'),
  ('AZ', CURRENT_DATE, 'drought', 'negative', -0.12, 0.41, 198, 'civic'),
  ('AR', CURRENT_DATE, 'barbecue', 'positive', 0.18, 0.25, 67, 'food ritual'),
  ('CA', CURRENT_DATE, 'housing', 'negative', -0.08, 0.45, 892, 'civic'),
  ('CO', CURRENT_DATE, 'trails', 'positive', 0.31, 0.22, 234, 'cultural'),
  ('CT', CURRENT_DATE, 'commute', 'negative', -0.14, 0.35, 89, 'social behavior'),
  ('DE', CURRENT_DATE, 'beach', 'positive', 0.25, 0.19, 34, 'cultural'),
  ('FL', CURRENT_DATE, 'hurricane', 'negative', -0.22, 0.48, 567, 'civic'),
  ('GA', CURRENT_DATE, 'peach', 'positive', 0.19, 0.27, 312, 'identity'),
  ('HI', CURRENT_DATE, 'aloha', 'positive', 0.42, 0.18, 78, 'heritage'),
  ('ID', CURRENT_DATE, 'potato', 'positive', 0.11, 0.23, 45, 'identity'),
  ('IL', CURRENT_DATE, 'pizza', 'positive', 0.16, 0.31, 445, 'food ritual'),
  ('IN', CURRENT_DATE, 'racing', 'positive', 0.21, 0.29, 156, 'cultural'),
  ('IA', CURRENT_DATE, 'corn', 'neutral', 0.03, 0.21, 62, 'identity'),
  ('KS', CURRENT_DATE, 'tornado', 'negative', -0.18, 0.43, 88, 'civic'),
  ('KY', CURRENT_DATE, 'bourbon', 'positive', 0.28, 0.24, 134, 'heritage'),
  ('LA', CURRENT_DATE, 'crawfish', 'positive', 0.35, 0.22, 267, 'food ritual'),
  ('ME', CURRENT_DATE, 'lobster', 'positive', 0.24, 0.20, 56, 'food ritual'),
  ('MD', CURRENT_DATE, 'crab', 'positive', 0.19, 0.26, 178, 'food ritual'),
  ('MA', CURRENT_DATE, 'wicked', 'positive', 0.12, 0.33, 389, 'dialect'),
  ('MI', CURRENT_DATE, 'lakes', 'positive', 0.20, 0.25, 234, 'identity'),
  ('MN', CURRENT_DATE, 'hotdish', 'positive', 0.17, 0.21, 167, 'food ritual'),
  ('MS', CURRENT_DATE, 'blues', 'positive', 0.14, 0.30, 54, 'heritage'),
  ('MO', CURRENT_DATE, 'gateway', 'neutral', 0.04, 0.28, 189, 'identity'),
  ('MT', CURRENT_DATE, 'ranch', 'positive', 0.23, 0.19, 38, 'heritage'),
  ('NE', CURRENT_DATE, 'husker', 'positive', 0.26, 0.27, 72, 'identity'),
  ('NV', CURRENT_DATE, 'desert', 'neutral', 0.01, 0.38, 145, 'identity'),
  ('NH', CURRENT_DATE, 'maple', 'positive', 0.21, 0.18, 41, 'heritage'),
  ('NJ', CURRENT_DATE, 'jawn', 'positive', 0.09, 0.34, 234, 'dialect'),
  ('NM', CURRENT_DATE, 'chile', 'positive', 0.27, 0.23, 67, 'food ritual'),
  ('NY', CURRENT_DATE, 'bodega', 'positive', 0.08, 0.42, 756, 'cultural'),
  ('NC', CURRENT_DATE, 'barbecue', 'positive', 0.22, 0.26, 245, 'food ritual'),
  ('ND', CURRENT_DATE, 'prairie', 'positive', 0.15, 0.17, 28, 'identity'),
  ('OH', CURRENT_DATE, 'buckeye', 'positive', 0.18, 0.29, 278, 'identity'),
  ('OK', CURRENT_DATE, 'rodeo', 'positive', 0.20, 0.25, 98, 'heritage'),
  ('OR', CURRENT_DATE, 'hiking', 'positive', 0.33, 0.21, 189, 'cultural'),
  ('PA', CURRENT_DATE, 'jawn', 'positive', 0.10, 0.32, 345, 'dialect'),
  ('RI', CURRENT_DATE, 'clambake', 'positive', 0.26, 0.20, 32, 'food ritual'),
  ('SC', CURRENT_DATE, 'grits', 'positive', 0.21, 0.24, 112, 'food ritual'),
  ('SD', CURRENT_DATE, 'rushmore', 'positive', 0.19, 0.18, 24, 'heritage'),
  ('TN', CURRENT_DATE, 'country', 'positive', 0.24, 0.28, 278, 'cultural'),
  ('TX', CURRENT_DATE, 'howdy', 'positive', 0.16, 0.35, 623, 'identity'),
  ('UT', CURRENT_DATE, 'canyon', 'positive', 0.29, 0.20, 112, 'identity'),
  ('VT', CURRENT_DATE, 'syrup', 'positive', 0.23, 0.17, 36, 'heritage'),
  ('VA', CURRENT_DATE, 'history', 'positive', 0.13, 0.27, 198, 'heritage'),
  ('WA', CURRENT_DATE, 'coffee', 'positive', 0.14, 0.30, 312, 'cultural'),
  ('WV', CURRENT_DATE, 'mountain', 'positive', 0.18, 0.23, 56, 'identity'),
  ('WI', CURRENT_DATE, 'cheese', 'positive', 0.25, 0.22, 178, 'food ritual'),
  ('WY', CURRENT_DATE, 'frontier', 'positive', 0.20, 0.16, 22, 'heritage')
ON CONFLICT (state, date) DO NOTHING;

-- Sample word scores for a few states
INSERT INTO state_word_daily (state, date, word, pos_tag, frequency, tfidf_score, sentiment_avg, spread_score, novelty_score, distinctiveness_score)
VALUES
  ('TX', CURRENT_DATE, 'howdy', 'NOUN', 342, 0.085, 0.16, 0.3, 0.0, 0.072),
  ('TX', CURRENT_DATE, 'barbecue', 'NOUN', 289, 0.071, 0.22, 0.8, 0.0, 0.065),
  ('TX', CURRENT_DATE, 'rodeo', 'NOUN', 198, 0.062, 0.20, 0.4, 0.0, 0.051),
  ('TX', CURRENT_DATE, 'ranch', 'NOUN', 167, 0.048, 0.18, 0.5, 0.0, 0.042),
  ('TX', CURRENT_DATE, 'frontier', 'NOUN', 134, 0.041, 0.15, 0.3, 0.1, 0.038),
  ('CA', CURRENT_DATE, 'housing', 'NOUN', 567, 0.092, -0.08, 0.9, 0.0, 0.081),
  ('CA', CURRENT_DATE, 'wildfire', 'NOUN', 445, 0.078, -0.31, 0.7, 0.2, 0.073),
  ('CA', CURRENT_DATE, 'hella', 'ADV', 312, 0.069, 0.12, 0.2, 0.0, 0.055),
  ('CA', CURRENT_DATE, 'traffic', 'NOUN', 289, 0.054, -0.15, 0.6, 0.0, 0.048),
  ('CA', CURRENT_DATE, 'tech', 'NOUN', 256, 0.047, 0.05, 0.8, 0.0, 0.044),
  ('NY', CURRENT_DATE, 'bodega', 'NOUN', 423, 0.088, 0.08, 0.3, 0.0, 0.071),
  ('NY', CURRENT_DATE, 'subway', 'NOUN', 389, 0.072, -0.12, 0.4, 0.0, 0.059),
  ('NY', CURRENT_DATE, 'rent', 'NOUN', 345, 0.065, -0.25, 0.7, 0.0, 0.055),
  ('NY', CURRENT_DATE, 'broadway', 'PROPN', 234, 0.051, 0.22, 0.5, 0.0, 0.045),
  ('NY', CURRENT_DATE, 'pizza', 'NOUN', 198, 0.044, 0.18, 0.6, 0.0, 0.040)
ON CONFLICT (date, state, word) DO NOTHING;

-- Sample word anthropology entries
INSERT INTO word_anthropology (word, lens, context, social_signal, spread_pattern, tags, classified)
VALUES
  ('football', 'social ritual', 'Team sport central to Southern and Midwestern identity', 'Community bonding, regional pride, Friday night tradition', 'nationwide but intensity peaks in SEC/Big 10 regions', ARRAY['cultural', 'social behavior', 'identity'], true),
  ('housing', 'economic anxiety', 'Cost of living discourse dominant in coastal metros', 'Class tension, generational divide, policy discourse', 'coastal origin, spreading to mid-tier cities', ARRAY['civic', 'social behavior'], true),
  ('hurricane', 'environmental threat', 'Seasonal weather events shaping Gulf and Atlantic coast discourse', 'Community resilience, emergency preparedness, climate anxiety', 'seasonal, Gulf/Atlantic coast concentrated', ARRAY['civic', 'cultural'], true),
  ('pizza', 'culinary identity warfare', 'Contested food tradition with fierce regional style allegiances (NY thin vs Chicago deep)', 'Regional pride, food identity, friendly rivalry', 'nationwide but style wars in NY, CT, IL', ARRAY['food ritual', 'identity', 'cultural'], true),
  ('coffee', 'daily ritual', 'Pacific Northwest specialty coffee culture as identity marker', 'Craft culture, morning ritual, third-wave identity', 'PNW origin, spread nationally via chains and independents', ARRAY['cultural', 'food ritual'], true)
ON CONFLICT (word) DO NOTHING;

-- Sample pipeline run
INSERT INTO pipeline_runs (run_date, task_name, status, rows_processed, errors, duration_seconds, started_at, completed_at)
VALUES
  (CURRENT_DATE, 'ingest_reddit', 'success', 4523, 2, 145.3, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 57 minutes'),
  (CURRENT_DATE, 'ingest_mastodon', 'success', 876, 0, 89.1, NOW() - INTERVAL '2 hours 57 minutes', NOW() - INTERVAL '2 hours 55 minutes'),
  (CURRENT_DATE, 'ingest_news', 'success', 1234, 1, 67.4, NOW() - INTERVAL '2 hours 55 minutes', NOW() - INTERVAL '2 hours 54 minutes'),
  (CURRENT_DATE, 'clean_and_tokenize', 'success', 6633, 0, 234.7, NOW() - INTERVAL '2 hours 54 minutes', NOW() - INTERVAL '2 hours 50 minutes'),
  (CURRENT_DATE, 'sentiment_analysis', 'success', 6633, 0, 178.2, NOW() - INTERVAL '2 hours 50 minutes', NOW() - INTERVAL '2 hours 47 minutes'),
  (CURRENT_DATE, 'word_scoring', 'success', 12500, 0, 56.8, NOW() - INTERVAL '2 hours 47 minutes', NOW() - INTERVAL '2 hours 46 minutes'),
  (CURRENT_DATE, 'entity_extraction', 'success', 3421, 0, 123.4, NOW() - INTERVAL '2 hours 46 minutes', NOW() - INTERVAL '2 hours 44 minutes'),
  (CURRENT_DATE, 'full_pipeline', 'success', 0, 3, 894.9, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 44 minutes')
ON CONFLICT DO NOTHING;
