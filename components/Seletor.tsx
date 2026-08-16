import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { cores, espacamento, fonte, raio, sombra } from '../theme';

export interface OpcaoSeletor {
  valor: string;
  rotulo: string;
}

/**
 * Lista suspensa em folha modal — mais confortável de acertar com a mão suja
 * ou com luva do que um picker nativo compacto.
 */
export function Seletor({
  valor,
  opcoes,
  aoSelecionar,
  placeholder = 'Selecione',
  style,
}: {
  valor: string | null;
  opcoes: OpcaoSeletor[];
  aoSelecionar: (valor: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [aberto, setAberto] = useState(false);
  const selecionada = opcoes.find((o) => o.valor === valor);

  return (
    <>
      <Pressable
        style={[estilos.campo, style]}
        onPress={() => setAberto(true)}
        accessibilityRole="button"
      >
        <Text style={estilos.campoTexto} numberOfLines={1}>
          {selecionada?.rotulo ?? placeholder}
        </Text>
        <ChevronDown size={16} color={cores.textoSuave} />
      </Pressable>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={() => setAberto(false)}>
        <Pressable style={estilos.fundo} onPress={() => setAberto(false)}>
          <View style={estilos.painel}>
            <FlatList
              data={opcoes}
              keyExtractor={(item) => item.valor}
              renderItem={({ item }) => {
                const ativa = item.valor === valor;
                return (
                  <Pressable
                    style={estilos.opcao}
                    onPress={() => {
                      aoSelecionar(item.valor);
                      setAberto(false);
                    }}
                  >
                    <Text style={[estilos.opcaoTexto, ativa && estilos.opcaoTextoAtiva]}>
                      {item.rotulo}
                    </Text>
                    {ativa && <Check size={18} color={cores.verde} />}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => <View style={estilos.divisor} />}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.sm,
    height: 46,
    paddingHorizontal: espacamento.md,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartao,
  },
  campoTexto: {
    flex: 1,
    fontSize: fonte.pequeno,
    color: cores.texto,
  },
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacamento.xl,
  },
  painel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '70%',
    backgroundColor: cores.cartao,
    borderRadius: raio.lg,
    paddingVertical: espacamento.sm,
    ...sombra.destaque,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.sm,
    paddingHorizontal: espacamento.lg,
    paddingVertical: espacamento.md,
  },
  opcaoTexto: {
    flex: 1,
    fontSize: fonte.corpo,
    color: cores.texto,
  },
  opcaoTextoAtiva: {
    fontWeight: '700',
    color: cores.verde,
  },
  divisor: {
    height: 1,
    backgroundColor: cores.borda,
    marginHorizontal: espacamento.lg,
  },
});
