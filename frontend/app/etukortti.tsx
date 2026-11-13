import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { OfferCard } from "@/components/OfferCard";
import { PromoCard } from "@/components/PromoCard";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { Tile } from "@/components/Tile";
import { brand } from "@/config";
import { colors, fontSize, iconSize, radius, spacing } from "@/theme";

const BARCODE_BUTTON_SIZE = 56;

const OFFERS = [
  { title: "Juustot", description: "-20 % kaikista juustoista" },
  { title: "Perunalastut", description: "2 pussia 4,00 €" },
  { title: "Kahvi", description: "-1,00 € / paketti" },
];

export default function CardScreen() {
  return (
    <Screen header={<CardBanner />} topColor={colors.primary} statusBarStyle="light">
      <Tile icon="shopping-outline" label="Bonus ja ostot" />
      <Tile icon="receipt-text-outline" label="Kuitit" />
      <PromoCard />
      <SectionHeader title="Etuja sinulle" actionLabel="Näytä kaikki" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.offers}
        contentContainerStyle={styles.offersContent}
      >
        {OFFERS.map((offer) => (
          <OfferCard key={offer.title} title={offer.title} description={offer.description} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function CardBanner() {
  return (
    <View style={styles.bannerArea}>
      <View style={styles.banner}>
        <Icon name="credit-card-outline" size={iconSize.feature} color={colors.onPrimary} />
        <Text style={styles.bannerTitle}>{brand.cardName}</Text>
        <View style={styles.barcodeButton}>
          <Icon name="barcode-scan" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerArea: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.lg,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    backgroundColor: colors.brand,
  },
  bannerTitle: {
    flex: 1,
    fontSize: fontSize.feature,
    fontWeight: "800",
    textTransform: "uppercase",
    color: colors.onPrimary,
  },
  barcodeButton: {
    width: BARCODE_BUTTON_SIZE,
    height: BARCODE_BUTTON_SIZE,
    borderRadius: radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  // Lets the carousel run edge to edge inside the padded screen content
  offers: {
    marginHorizontal: -spacing.md,
  },
  offersContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
});
