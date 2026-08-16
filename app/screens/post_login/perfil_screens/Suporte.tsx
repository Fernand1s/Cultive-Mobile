import { LifeBuoy } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';

import { TelaInterna } from '../../../../components/TelaInterna';
import { Cartao, EstadoVazio } from '../../../../components/ui';
import { cores, espacamento, fonte } from '../../../../theme';

/** Placeholder — os canais de atendimento ainda serão definidos. */
export default function Suporte() {
  return (
    <TelaInterna titulo="Suporte" subtitulo="Ajuda com o Cultive+ Mobile.">
      <EstadoVazio
        icone={<LifeBuoy size={40} color={cores.textoFraco} />}
        titulo="Em construção"
        descricao="Os canais de atendimento serão disponibilizados em breve."
      />

      <Cartao style={estilos.bloco}>
        <Text style={estilos.titulo}>Enquanto isso</Text>
        <Text style={estilos.texto}>
          Para dúvidas sobre tarefas, cultivos ou estoque, procure o responsável pela sua área no
          sistema web do Cultive+.
        </Text>
      </Cartao>
    </TelaInterna>
  );
}

const estilos = StyleSheet.create({
  bloco: {
    gap: espacamento.sm,
  },
  titulo: {
    fontSize: fonte.corpo,
    fontWeight: '700',
    color: cores.texto,
  },
  texto: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
    lineHeight: 19,
  },
});
