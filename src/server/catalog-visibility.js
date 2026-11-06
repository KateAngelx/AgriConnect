export function isRemovedBenguetSeller(item) {
  return (
    item?.id === 'benguet-growers' ||
    /benguet/i.test(item?.farmName || item?.farm_name || item?.location || '')
  )
}

export function isRemovedBenguetProduct(item) {
  return (
    item?.seller === 'benguet-growers' ||
    item?.seller_id === 'benguet-growers' ||
    item?.seller?.id === 'benguet-growers' ||
    /highland\s+(strawberries|potatoes)/i.test(item?.name || '')
  )
}

export function isRemovedNuevaEcijaSeller(item) {
  return (
    item?.id === 'nueva-ecija-rice' ||
    /nueva ecija/i.test(item?.farmName || item?.farm_name || item?.location || '')
  )
}

export function isRemovedNuevaEcijaProduct(item) {
  return (
    item?.seller === 'nueva-ecija-rice' ||
    item?.seller_id === 'nueva-ecija-rice' ||
    item?.seller?.id === 'nueva-ecija-rice' ||
    (/nueva ecija/i.test(item?.location || '') && /rice/i.test(item?.name || ''))
  )
}
