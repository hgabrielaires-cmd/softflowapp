
-- =============================================================
-- Fix: Allow followers and mentioned users to comment/like
-- even if they don't have access to the card's filial.
-- =============================================================

-- 1) painel_comentarios: Replace RESTRICTIVE filial filter with one that also allows followers/mentioned
DROP POLICY IF EXISTS "Filial filter painel_comentarios" ON public.painel_comentarios;

CREATE POLICY "Filial ou seguidor painel_comentarios"
ON public.painel_comentarios
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM painel_atendimento pa
    WHERE pa.id = painel_comentarios.card_id
    AND user_has_filial_access(pa.filial_id)
  )
  OR
  EXISTS (
    SELECT 1 FROM painel_seguidores ps
    WHERE ps.card_id = painel_comentarios.card_id
    AND ps.user_id = auth.uid()
    AND ps.unfollowed_at IS NULL
  )
  OR
  EXISTS (
    SELECT 1 FROM painel_mencoes pm
    WHERE pm.card_id = painel_comentarios.card_id
    AND pm.mencionado_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM painel_atendimento pa
    WHERE pa.id = painel_comentarios.card_id
    AND user_has_filial_access(pa.filial_id)
  )
  OR
  EXISTS (
    SELECT 1 FROM painel_seguidores ps
    WHERE ps.card_id = painel_comentarios.card_id
    AND ps.user_id = auth.uid()
    AND ps.unfollowed_at IS NULL
  )
  OR
  EXISTS (
    SELECT 1 FROM painel_mencoes pm
    WHERE pm.card_id = painel_comentarios.card_id
    AND pm.mencionado_user_id = auth.uid()
  )
);

-- 2) painel_curtidas: Replace RESTRICTIVE filial filter with one that also allows followers/mentioned
DROP POLICY IF EXISTS "Filial filter painel_curtidas" ON public.painel_curtidas;

CREATE POLICY "Filial ou seguidor painel_curtidas"
ON public.painel_curtidas
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM painel_comentarios pc
    JOIN painel_atendimento pa ON pa.id = pc.card_id
    WHERE pc.id = painel_curtidas.comentario_id
    AND user_has_filial_access(pa.filial_id)
  )
  OR
  EXISTS (
    SELECT 1 FROM painel_comentarios pc
    JOIN painel_seguidores ps ON ps.card_id = pc.card_id
    WHERE pc.id = painel_curtidas.comentario_id
    AND ps.user_id = auth.uid()
    AND ps.unfollowed_at IS NULL
  )
  OR
  EXISTS (
    SELECT 1 FROM painel_comentarios pc
    JOIN painel_mencoes pm ON pm.card_id = pc.card_id
    WHERE pc.id = painel_curtidas.comentario_id
    AND pm.mencionado_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM painel_comentarios pc
    JOIN painel_atendimento pa ON pa.id = pc.card_id
    WHERE pc.id = painel_curtidas.comentario_id
    AND user_has_filial_access(pa.filial_id)
  )
  OR
  EXISTS (
    SELECT 1 FROM painel_comentarios pc
    JOIN painel_seguidores ps ON ps.card_id = pc.card_id
    WHERE pc.id = painel_curtidas.comentario_id
    AND ps.user_id = auth.uid()
    AND ps.unfollowed_at IS NULL
  )
  OR
  EXISTS (
    SELECT 1 FROM painel_comentarios pc
    JOIN painel_mencoes pm ON pm.card_id = pc.card_id
    WHERE pc.id = painel_curtidas.comentario_id
    AND pm.mencionado_user_id = auth.uid()
  )
);
