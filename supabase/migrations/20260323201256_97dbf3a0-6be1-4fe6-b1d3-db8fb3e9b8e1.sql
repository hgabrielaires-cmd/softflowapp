
ALTER TABLE public.chat_configuracoes
  ADD COLUMN IF NOT EXISTS horarios_por_dia jsonb DEFAULT '{
    "0": {"atendimento": {"ativo": false, "inicio": "", "fim": ""}, "plantao": {"ativo": true, "inicio": "08:00", "fim": "23:59"}},
    "1": {"atendimento": {"ativo": true, "inicio": "08:00", "fim": "18:00"}, "plantao": {"ativo": true, "inicio": "18:00", "fim": "23:59"}},
    "2": {"atendimento": {"ativo": true, "inicio": "08:00", "fim": "18:00"}, "plantao": {"ativo": true, "inicio": "18:00", "fim": "23:59"}},
    "3": {"atendimento": {"ativo": true, "inicio": "08:00", "fim": "18:00"}, "plantao": {"ativo": true, "inicio": "18:00", "fim": "23:59"}},
    "4": {"atendimento": {"ativo": true, "inicio": "08:00", "fim": "18:00"}, "plantao": {"ativo": true, "inicio": "18:00", "fim": "23:59"}},
    "5": {"atendimento": {"ativo": true, "inicio": "08:00", "fim": "18:00"}, "plantao": {"ativo": true, "inicio": "18:00", "fim": "23:59"}},
    "6": {"atendimento": {"ativo": false, "inicio": "", "fim": ""}, "plantao": {"ativo": true, "inicio": "12:00", "fim": "23:59"}}
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS mensagem_plantao text DEFAULT '🚨 *Atenção: Estamos em regime de plantão.* Atendemos apenas casos emergenciais neste horário. Descreva sua situação e retornaremos o mais breve possível.';
