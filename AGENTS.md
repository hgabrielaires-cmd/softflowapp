# Architecture rules

- Use the opt-in `AppLayout` chat layout for viewport-bound messaging screens; this keeps conversation scrolling independent of the app shell without changing other pages.
- On mobile, the WhatsApp chat displays either its conversation list or the selected conversation, with a local back action; desktop keeps the multi-column layout.- WhatsApp Meta credentials live one row per number in whatsapp_meta_numeros (token readable only server-side); edges resolve by phone_number_id/conversa and fall back to the default number, then integracoes_config, so several numbers can coexist.
