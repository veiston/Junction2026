import { StyleSheet, Text, View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { Badge } from "@/components/Badge";
import { BonusMeter } from "@/components/BonusMeter";
import { HeaderBar } from "@/components/HeaderBar";
import { Icon } from "@/components/Icon";
import { IconButton } from "@/components/IconButton";
import { ListGroup } from "@/components/ListGroup";
import { ListRow } from "@/components/ListRow";
import { Pager } from "@/components/Pager";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { colors, fontSize, spacing } from "@/theme";

export default function HomeScreen() {
  const header = <HeaderBar left={<IconButton icon="logout" />} right={<IconButton icon="message-outline" showDot />} />;
  const hero = (
    <View style={styles.hero}>
      <Pager pages={[<BonusSlide key="bonus" />, <BenefitSlide key="benefit" />]} />
    </View>
  );

  return (
    <Screen header={header} hero={hero}>
      <ListGroup>
        <ListRow icon="email-outline" title="Uudet pankkiviestit" trailing={<Badge count={3} />} />
      </ListGroup>
      <View style={styles.actions}>
        <ActionButton icon="plus" label="Uusi maksu" />
        <ActionButton icon="map-marker-outline" label="Edut lähellä" />
        <ActionButton icon="bookmark-outline" label="Tallennetut edut" />
      </View>
      <SectionHeader title="Tilit ja kortit" />
      <ListGroup>
        <ListRow icon="notebook-outline" title="Käyttötili" subtitle="16,73 €" />
        <ListRow icon="credit-card-outline" title="Visa Debit" subtitle="16,73 €" />
      </ListGroup>
    </Screen>
  );
}

function BonusSlide() {
  return (
    <View style={styles.slide}>
      <BonusMeter />
      <View style={styles.link}>
        <Text style={styles.linkLabel}>Katso kokonaishyötysi</Text>
        <Icon name="chevron-right" />
      </View>
    </View>
  );
}

function BenefitSlide() {
  return (
    <View style={[styles.slide, styles.benefit]}>
      <Text style={styles.benefitTitle}>Kokonaishyötysi tänä vuonna</Text>
      <Text style={styles.benefitAmount}>23,48 €</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: spacing.lg,
    backgroundColor: colors.surface,
  },
  slide: {
    gap: spacing.lg,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  linkLabel: {
    fontSize: fontSize.title,
    fontWeight: "700",
    color: colors.primary,
  },
  benefit: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: {
    fontSize: fontSize.title,
    color: colors.primary,
  },
  benefitAmount: {
    fontSize: fontSize.display,
    fontWeight: "800",
    color: colors.primary,
  },
  actions: {
    flexDirection: "row",
    paddingVertical: spacing.md,
  },
});
