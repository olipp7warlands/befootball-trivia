insert into achievements (id, name, description, icon, rarity, condition) values
  (
    'hat-trick',
    'Hat-trick',
    '3 victorias seguidas',
    'flame',
    'common',
    '{"type":"streak","value":3}'
  ),
  (
    'penalti',
    'Penalti',
    'Acierta una pregunta en menos de 3 segundos',
    'bolt',
    'common',
    '{"type":"fast_answer_ms","value":3000}'
  ),
  (
    'pichichi',
    'Pichichi',
    '100 aciertos totales',
    'target-arrow',
    'rare',
    '{"type":"total_correct","value":100}'
  ),
  (
    'memoria',
    'Memoria de elefante',
    'Perfect en una ronda de Anécdotas',
    'history',
    'rare',
    '{"type":"perfect_round","category":"anecdotas"}'
  ),
  (
    'sin-var',
    'Sin VAR',
    'Gana una partida sin usar power-ups',
    'shield-check',
    'rare',
    '{"type":"win_no_powerups"}'
  ),
  (
    'coleccionista',
    'Coleccionista',
    'Acierta una pregunta de cada década',
    'world',
    'rare',
    '{"type":"decade_collector"}'
  ),
  (
    'elite-befootball',
    'Élite Befootball',
    'Llega a la división Élite',
    'crown',
    'legendary',
    '{"type":"division","value":"elite"}'
  )
on conflict (id) do nothing;
