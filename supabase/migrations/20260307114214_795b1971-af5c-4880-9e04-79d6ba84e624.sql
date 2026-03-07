
-- CONTRATO_BASE: Change Decisor to Contato + signature uses responsavel_nome
UPDATE document_templates 
SET conteudo_html = REPLACE(
  REPLACE(conteudo_html, 
    '<strong>Decisor:</strong> {{contato.nome_decisor}}', 
    '<strong>Contato:</strong> {{contato.nome_decisor}}'
  ),
  '{{contato.nome_decisor}}
            </div>
        </div>
    </div>
</div>',
  '{{cliente.responsavel_nome}}
            </div>
        </div>
    </div>
</div>'
),
updated_at = now()
WHERE id = '90b43be1-9659-4550-aedb-b39245d61657';

-- ADITIVO_UPGRADE: signature uses responsavel_nome  
UPDATE document_templates 
SET conteudo_html = REPLACE(conteudo_html,
  '{{contato.nome_decisor}}
  </div>
</div>

</div>
</body>
</html>',
  '{{cliente.responsavel_nome}}
  </div>
</div>

</div>
</body>
</html>'
),
updated_at = now()
WHERE id = '22a2eed2-f6ea-4700-95df-62e4475e6540';

-- ADITIVO_MODULO: signature uses responsavel_nome
UPDATE document_templates 
SET conteudo_html = REPLACE(conteudo_html,
  '{{contato.nome_decisor}}
    </div>
  </div>

</div>
</body>
</html>',
  '{{cliente.responsavel_nome}}
    </div>
  </div>

</div>
</body>
</html>'
),
updated_at = now()
WHERE id = '515ae823-c0a1-4f23-a601-67f686afe1b5';
