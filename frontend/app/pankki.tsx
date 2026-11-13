import { StyleSheet, View } from "react-native";

import { FeatureCard } from "@/components/FeatureCard";
import { HeaderBar } from "@/components/HeaderBar";
import { IconButton } from "@/components/IconButton";
import { Screen } from "@/components/Screen";
import { brand } from "@/config";
import { spacing } from "@/theme";

const BALANCE = "16,73 €";

export default function BankScreen() {
  const header = <HeaderBar title={brand.bankName} right={<IconButton icon="message-outline" showDot />} />;

  return (
    <Screen header={header}>
      <View style={styles.cards}>
        <FeatureCard icon="notebook-outline" title="Tilit" description="Käyttötili" amount={BALANCE} />
        <FeatureCard
          icon="file-document-outline"
          title="Maksut ja e-laskut"
          description="Tee uusi maksu tai tarkastele ja tilaa e-laskuja"
        />
        <FeatureCard icon="credit-card-outline" title="Kortit" description="Visa Debit" amount={BALANCE} />
        <FeatureCard icon="trophy-outline" title="Säästäjä" description="Säästä automaattisesti joka kuukausi" />
        <FeatureCard
          icon="briefcase-outline"
          title="Sijoitukset"
          description="Tutustu säästämisen ja sijoittamisen palveluihin"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
});
